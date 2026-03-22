package com.whatsappcrm.service;

import com.whatsappcrm.entity.*;
import com.whatsappcrm.enums.ConversationStatus;
import com.whatsappcrm.enums.MessageType;
import com.whatsappcrm.enums.SenderType;
import com.whatsappcrm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Chatbot Flow Execution Engine.
 * Processes incoming messages against active chatbot flows, manages sessions,
 * and executes flow nodes (send messages, menus, conditions, handoffs).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotEngine {

    private final ChatbotFlowRepository flowRepository;
    private final ChatbotSessionRepository sessionRepository;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final WebSocketEventService webSocketEventService;

    /**
     * Called when an incoming message is received.
     * Returns true if the chatbot handled the message (agents should not be notified).
     * Returns false if no chatbot flow matched or if the flow handed off to an agent.
     */
    @Transactional
    public boolean processIncomingMessage(Message message, Conversation conversation) {
        Long accountId = conversation.getAccount().getId();
        Long inboxId = conversation.getInbox().getId();

        // 1. Check if there's an active chatbot session for this conversation
        Optional<ChatbotSession> existingSession = sessionRepository
                .findByConversationIdAndStatus(conversation.getId(), "ACTIVE");

        if (existingSession.isPresent()) {
            // Continue the existing flow
            return continueFlow(existingSession.get(), message, conversation);
        }

        // 2. No active session — try to find a matching flow to start
        ChatbotFlow matchingFlow = findMatchingFlow(accountId, inboxId, message, conversation);

        if (matchingFlow == null) {
            return false; // No chatbot flow matched
        }

        // 3. Start a new chatbot session
        return startFlow(matchingFlow, message, conversation);
    }

    /**
     * Find a flow that matches the current context (inbox, trigger type, keywords).
     */
    private ChatbotFlow findMatchingFlow(Long accountId, Long inboxId, Message message, Conversation conversation) {
        // Get all active flows for this inbox + global flows (no inbox filter)
        List<ChatbotFlow> flows = new ArrayList<>();
        flows.addAll(flowRepository.findByAccountIdAndActiveTrueAndInboxIdOrderByPriorityAsc(accountId, inboxId));
        flows.addAll(flowRepository.findByAccountIdAndActiveTrueAndInboxIsNullOrderByPriorityAsc(accountId));

        // Sort by priority
        flows.sort(Comparator.comparingInt(ChatbotFlow::getPriority));

        String messageContent = message.getContent() != null ? message.getContent().toLowerCase().trim() : "";

        for (ChatbotFlow flow : flows) {
            if (flow.getFlowData() == null) continue;

            switch (flow.getTriggerType()) {
                case "WELCOME":
                    // Only trigger on the very first message in a new conversation
                    long msgCount = messageRepository.countByConversationId(conversation.getId());
                    if (msgCount <= 1) { // The current message is the first
                        return flow;
                    }
                    break;

                case "KEYWORD":
                    if (flow.getTriggerKeywords() != null && !flow.getTriggerKeywords().isEmpty()) {
                        String[] keywords = flow.getTriggerKeywords().split(",");
                        for (String keyword : keywords) {
                            String trimmed = keyword.trim().toLowerCase();
                            if (!trimmed.isEmpty() && messageContent.contains(trimmed)) {
                                return flow;
                            }
                        }
                    }
                    break;

                case "CONVERSATION_CREATED":
                    // Check if conversation was recently created (within last 5 seconds)
                    if (conversation.getCreatedAt() != null &&
                        conversation.getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(5))) {
                        return flow;
                    }
                    break;
            }
        }

        return null;
    }

    /**
     * Start a new chatbot flow for a conversation.
     */
    @SuppressWarnings("unchecked")
    private boolean startFlow(ChatbotFlow flow, Message message, Conversation conversation) {
        log.info("Starting chatbot flow '{}' for conversation #{}", flow.getName(), conversation.getDisplayId());

        // Create a new session
        ChatbotSession session = ChatbotSession.builder()
                .conversation(conversation)
                .chatbotFlow(flow)
                .status("ACTIVE")
                .sessionData(new HashMap<>())
                .build();
        session = sessionRepository.save(session);

        // Find the start node
        Map<String, Object> flowData = flow.getFlowData();
        List<Map<String, Object>> nodes = (List<Map<String, Object>>) flowData.get("nodes");
        List<Map<String, Object>> edges = (List<Map<String, Object>>) flowData.get("edges");

        if (nodes == null || nodes.isEmpty()) return false;

        Map<String, Object> startNode = findNodeByType(nodes, "start");
        if (startNode == null) {
            // Use the first node as start
            startNode = nodes.get(0);
        }

        // Execute from the start node
        String startNodeId = (String) startNode.get("id");
        return executeFromNode(session, startNodeId, nodes, edges, message, conversation);
    }

    /**
     * Continue an existing flow when a user sends a new message.
     */
    @SuppressWarnings("unchecked")
    private boolean continueFlow(ChatbotSession session, Message message, Conversation conversation) {
        ChatbotFlow flow = session.getChatbotFlow();
        Map<String, Object> flowData = flow.getFlowData();
        List<Map<String, Object>> nodes = (List<Map<String, Object>>) flowData.get("nodes");
        List<Map<String, Object>> edges = (List<Map<String, Object>>) flowData.get("edges");

        if (nodes == null || edges == null) return false;

        String currentNodeId = session.getCurrentNodeId();
        if (currentNodeId == null) return false;

        Map<String, Object> currentNode = findNodeById(nodes, currentNodeId);
        if (currentNode == null) return false;

        String nodeType = (String) currentNode.get("type");
        Map<String, Object> nodeData = getNodeData(currentNode);

        String userMessage = message.getContent() != null ? message.getContent().trim() : "";

        // Handle based on what we were waiting for
        switch (nodeType) {
            case "wait_for_reply":
            case "collect_input": {
                // Store the user's input
                String variableName = getStringFromData(nodeData, "variableName");
                if (variableName != null && !variableName.isEmpty()) {
                    Map<String, Object> data = session.getSessionData();
                    data.put(variableName, userMessage);
                    session.setSessionData(data);
                }

                // Move to the next node
                String nextNodeId = findNextNode(edges, currentNodeId, null);
                if (nextNodeId != null) {
                    return executeFromNode(session, nextNodeId, nodes, edges, message, conversation);
                } else {
                    endSession(session, "COMPLETED");
                    return true;
                }
            }

            case "menu": {
                // User selected a menu option — match their reply to an option
                List<Map<String, Object>> options = getOptionsFromData(nodeData);
                String selectedHandle = matchMenuOption(userMessage, options);

                if (selectedHandle != null) {
                    // Store selected option
                    Map<String, Object> data = session.getSessionData();
                    data.put("last_menu_selection", userMessage);
                    session.setSessionData(data);

                    // Follow the edge for this specific handle (option)
                    String nextNodeId = findNextNode(edges, currentNodeId, selectedHandle);
                    if (nextNodeId == null) {
                        // Fallback: try default edge
                        nextNodeId = findNextNode(edges, currentNodeId, null);
                    }
                    if (nextNodeId != null) {
                        return executeFromNode(session, nextNodeId, nodes, edges, message, conversation);
                    }
                } else {
                    // Invalid option — re-send the menu
                    sendBotMessage(conversation, "Sorry, I didn't understand that. Please select one of the options:");
                    resendMenu(conversation, nodeData);
                    return true;
                }
                endSession(session, "COMPLETED");
                return true;
            }

            case "condition": {
                // Evaluate condition based on user's response
                String nextNodeId = evaluateCondition(nodeData, userMessage, edges, currentNodeId, session);
                if (nextNodeId != null) {
                    return executeFromNode(session, nextNodeId, nodes, edges, message, conversation);
                }
                endSession(session, "COMPLETED");
                return true;
            }

            default:
                // Shouldn't be waiting at a non-interactive node, skip
                return false;
        }
    }

    /**
     * Execute nodes starting from a given node, following edges until we hit
     * a node that requires user input (menu, wait_for_reply, collect_input) or an end.
     */
    @SuppressWarnings("unchecked")
    private boolean executeFromNode(ChatbotSession session, String nodeId,
                                     List<Map<String, Object>> nodes,
                                     List<Map<String, Object>> edges,
                                     Message triggerMessage, Conversation conversation) {
        String currentId = nodeId;
        int safetyCounter = 0; // Prevent infinite loops

        while (currentId != null && safetyCounter < 50) {
            safetyCounter++;
            Map<String, Object> node = findNodeById(nodes, currentId);
            if (node == null) break;

            String type = (String) node.get("type");
            Map<String, Object> data = getNodeData(node);

            switch (type) {
                case "start": {
                    // Just move to next node
                    currentId = findNextNode(edges, currentId, null);
                    break;
                }

                case "send_message": {
                    String msgText = getStringFromData(data, "message");
                    if (msgText != null && !msgText.isEmpty()) {
                        msgText = resolveVariables(msgText, session.getSessionData(), conversation);
                        sendBotMessage(conversation, msgText);
                    }
                    currentId = findNextNode(edges, currentId, null);
                    break;
                }

                case "menu": {
                    // Send the menu prompt and WAIT for user reply
                    String menuPrompt = getStringFromData(data, "message");
                    if (menuPrompt != null && !menuPrompt.isEmpty()) {
                        menuPrompt = resolveVariables(menuPrompt, session.getSessionData(), conversation);
                        sendBotMessage(conversation, menuPrompt);
                    }
                    resendMenu(conversation, data);

                    // Save session state — we're waiting for user input
                    session.setCurrentNodeId(currentId);
                    sessionRepository.save(session);
                    return true;
                }

                case "wait_for_reply":
                case "collect_input": {
                    // Send prompt message if configured
                    String prompt = getStringFromData(data, "message");
                    if (prompt != null && !prompt.isEmpty()) {
                        prompt = resolveVariables(prompt, session.getSessionData(), conversation);
                        sendBotMessage(conversation, prompt);
                    }

                    // Save session state — we're waiting for user input
                    session.setCurrentNodeId(currentId);
                    sessionRepository.save(session);
                    return true;
                }

                case "condition": {
                    // Auto-evaluate condition based on session data
                    String conditionVar = getStringFromData(data, "variable");
                    String conditionValue = "";
                    if (conditionVar != null && session.getSessionData().containsKey(conditionVar)) {
                        conditionValue = String.valueOf(session.getSessionData().get(conditionVar));
                    }
                    currentId = evaluateCondition(data, conditionValue, edges, currentId, session);
                    break;
                }

                case "assign_agent": {
                    String agentIdStr = getStringFromData(data, "agentId");
                    if (agentIdStr != null) {
                        try {
                            Long agentId = Long.parseLong(agentIdStr);
                            User agent = userRepository.findById(agentId).orElse(null);
                            if (agent != null) {
                                conversation.setAssignee(agent);
                                conversationRepository.save(conversation);
                                sendBotMessage(conversation,
                                        getStringFromData(data, "message") != null
                                                ? resolveVariables(getStringFromData(data, "message"), session.getSessionData(), conversation)
                                                : "You've been connected to an agent. They'll be with you shortly!");
                            }
                        } catch (NumberFormatException ignored) {}
                    } else {
                        // No specific agent — just send handoff message
                        sendBotMessage(conversation,
                                getStringFromData(data, "message") != null
                                        ? resolveVariables(getStringFromData(data, "message"), session.getSessionData(), conversation)
                                        : "Connecting you to an agent. Please wait...");
                    }
                    endSession(session, "HANDED_OFF");
                    return false; // Return false so agent gets notified
                }

                case "assign_team": {
                    String teamIdStr = getStringFromData(data, "teamId");
                    if (teamIdStr != null) {
                        try {
                            Long teamId = Long.parseLong(teamIdStr);
                            Team team = teamRepository.findById(teamId).orElse(null);
                            if (team != null) {
                                conversation.setTeam(team);
                                conversationRepository.save(conversation);
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                    sendBotMessage(conversation,
                            getStringFromData(data, "message") != null
                                    ? resolveVariables(getStringFromData(data, "message"), session.getSessionData(), conversation)
                                    : "Transferring you to our team. Please wait...");
                    endSession(session, "HANDED_OFF");
                    return false;
                }

                case "change_status": {
                    String newStatus = getStringFromData(data, "status");
                    if (newStatus != null) {
                        try {
                            conversation.setStatus(ConversationStatus.valueOf(newStatus));
                            conversationRepository.save(conversation);
                        } catch (IllegalArgumentException ignored) {}
                    }
                    currentId = findNextNode(edges, currentId, null);
                    break;
                }

                case "close_conversation": {
                    String closeMsg = getStringFromData(data, "message");
                    if (closeMsg != null && !closeMsg.isEmpty()) {
                        sendBotMessage(conversation, resolveVariables(closeMsg, session.getSessionData(), conversation));
                    }
                    conversation.setStatus(ConversationStatus.RESOLVED);
                    conversationRepository.save(conversation);
                    endSession(session, "COMPLETED");
                    return true;
                }

                case "end": {
                    String endMsg = getStringFromData(data, "message");
                    if (endMsg != null && !endMsg.isEmpty()) {
                        sendBotMessage(conversation, resolveVariables(endMsg, session.getSessionData(), conversation));
                    }
                    endSession(session, "COMPLETED");
                    return true;
                }

                default: {
                    // Unknown node type — skip to next
                    currentId = findNextNode(edges, currentId, null);
                    break;
                }
            }
        }

        // If we fall through, end the session
        endSession(session, "COMPLETED");
        return true;
    }

    // ---- Helper Methods ----

    private void sendBotMessage(Conversation conversation, String content) {
        Message botMsg = Message.builder()
                .account(conversation.getAccount())
                .conversation(conversation)
                .inbox(conversation.getInbox())
                .content(content)
                .messageType(MessageType.OUTGOING)
                .senderType(SenderType.USER)
                .senderId(null) // Bot message, no specific agent
                .build();
        botMsg = messageRepository.save(botMsg);

        conversation.setLastActivityAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        // Broadcast to frontend via WebSocket
        webSocketEventService.broadcastNewMessage(
                conversation.getAccount().getId(),
                conversation.getId(),
                Map.of(
                        "id", botMsg.getId(),
                        "content", content,
                        "messageType", "OUTGOING",
                        "senderType", "USER",
                        "senderName", "Bot",
                        "privateFlag", false,
                        "createdAt", botMsg.getCreatedAt().toString()
                )
        );
    }

    @SuppressWarnings("unchecked")
    private void resendMenu(Conversation conversation, Map<String, Object> nodeData) {
        List<Map<String, Object>> options = getOptionsFromData(nodeData);
        if (options == null || options.isEmpty()) return;

        StringBuilder menuText = new StringBuilder();
        for (int i = 0; i < options.size(); i++) {
            Map<String, Object> opt = options.get(i);
            String label = (String) opt.getOrDefault("label", "Option " + (i + 1));
            menuText.append(i + 1).append(". ").append(label).append("\n");
        }

        sendBotMessage(conversation, menuText.toString().trim());
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> getOptionsFromData(Map<String, Object> data) {
        if (data == null) return Collections.emptyList();
        Object optionsObj = data.get("options");
        if (optionsObj instanceof List) {
            return (List<Map<String, Object>>) optionsObj;
        }
        return Collections.emptyList();
    }

    private String matchMenuOption(String userMessage, List<Map<String, Object>> options) {
        if (options == null || options.isEmpty()) return null;
        String input = userMessage.toLowerCase().trim();

        for (int i = 0; i < options.size(); i++) {
            Map<String, Object> opt = options.get(i);
            String label = ((String) opt.getOrDefault("label", "")).toLowerCase();
            String value = ((String) opt.getOrDefault("value", "")).toLowerCase();
            String handle = (String) opt.getOrDefault("handle", "option_" + i);

            // Match by number (1, 2, 3...), label text, or value
            if (input.equals(String.valueOf(i + 1))
                || input.equals(label)
                || input.equals(value)
                || (!label.isEmpty() && input.contains(label))) {
                return handle;
            }
        }

        return null; // No match
    }

    @SuppressWarnings("unchecked")
    private String evaluateCondition(Map<String, Object> nodeData, String value,
                                      List<Map<String, Object>> edges, String nodeId,
                                      ChatbotSession session) {
        // Conditions have multiple branches — try to match
        List<Map<String, Object>> conditions = null;
        if (nodeData != null && nodeData.containsKey("conditions")) {
            conditions = (List<Map<String, Object>>) nodeData.get("conditions");
        }

        if (conditions != null) {
            for (Map<String, Object> cond : conditions) {
                String operator = (String) cond.getOrDefault("operator", "contains");
                String condValue = (String) cond.getOrDefault("value", "");
                String handle = (String) cond.getOrDefault("handle", "");

                boolean matched = switch (operator) {
                    case "equals" -> value.equalsIgnoreCase(condValue);
                    case "contains" -> value.toLowerCase().contains(condValue.toLowerCase());
                    case "not_contains" -> !value.toLowerCase().contains(condValue.toLowerCase());
                    case "not_equals" -> !value.equalsIgnoreCase(condValue);
                    case "starts_with" -> value.toLowerCase().startsWith(condValue.toLowerCase());
                    default -> false;
                };

                if (matched) {
                    String nextNode = findNextNode(edges, nodeId, handle);
                    if (nextNode != null) return nextNode;
                }
            }
        }

        // Default / else branch
        String defaultNext = findNextNode(edges, nodeId, "default");
        if (defaultNext == null) {
            defaultNext = findNextNode(edges, nodeId, null);
        }
        return defaultNext;
    }

    private String resolveVariables(String text, Map<String, Object> sessionData, Conversation conversation) {
        if (text == null) return null;

        // Replace session variables: {{variable_name}}
        for (Map.Entry<String, Object> entry : sessionData.entrySet()) {
            text = text.replace("{{" + entry.getKey() + "}}", String.valueOf(entry.getValue()));
        }

        // Replace contact info
        if (conversation.getContact() != null) {
            Contact contact = conversation.getContact();
            text = text.replace("{{contact_name}}", contact.getName() != null ? contact.getName() : "");
            text = text.replace("{{contact_phone}}", contact.getPhoneNumber() != null ? contact.getPhoneNumber() : "");
            text = text.replace("{{contact_email}}", contact.getEmail() != null ? contact.getEmail() : "");
        }

        return text;
    }

    private void endSession(ChatbotSession session, String status) {
        session.setStatus(status);
        sessionRepository.save(session);
        log.info("Chatbot session {} ended with status: {}", session.getId(), status);
    }

    private Map<String, Object> findNodeById(List<Map<String, Object>> nodes, String id) {
        return nodes.stream()
                .filter(n -> id.equals(n.get("id")))
                .findFirst()
                .orElse(null);
    }

    private Map<String, Object> findNodeByType(List<Map<String, Object>> nodes, String type) {
        return nodes.stream()
                .filter(n -> type.equals(n.get("type")))
                .findFirst()
                .orElse(null);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getNodeData(Map<String, Object> node) {
        Object data = node.get("data");
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
        return Collections.emptyMap();
    }

    private String getStringFromData(Map<String, Object> data, String key) {
        if (data == null) return null;
        Object val = data.get(key);
        return val != null ? String.valueOf(val) : null;
    }

    /**
     * Find the next node connected via an edge from sourceNodeId.
     * If handleId is specified, matches edges with that sourceHandle.
     * If handleId is null, returns the first edge without a specific handle or any edge.
     */
    @SuppressWarnings("unchecked")
    private String findNextNode(List<Map<String, Object>> edges, String sourceNodeId, String handleId) {
        if (edges == null) return null;

        for (Map<String, Object> edge : edges) {
            String source = (String) edge.get("source");
            if (!sourceNodeId.equals(source)) continue;

            String sourceHandle = (String) edge.get("sourceHandle");

            if (handleId != null) {
                // Looking for a specific handle
                if (handleId.equals(sourceHandle)) {
                    return (String) edge.get("target");
                }
            } else {
                // Looking for the default (no handle) edge
                if (sourceHandle == null || sourceHandle.isEmpty()) {
                    return (String) edge.get("target");
                }
            }
        }

        // Fallback: return the first edge from this source (any handle)
        if (handleId == null) {
            for (Map<String, Object> edge : edges) {
                if (sourceNodeId.equals(edge.get("source"))) {
                    return (String) edge.get("target");
                }
            }
        }

        return null;
    }
}
