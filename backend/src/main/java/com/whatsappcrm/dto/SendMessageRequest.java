package com.whatsappcrm.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class SendMessageRequest {

    private String content;

    private String messageType;

    private Boolean privateFlag;

    /**
     * Content type: "text" (default), "interactive_buttons", "interactive_list"
     */
    private String contentType;

    /**
     * Interactive message data. Structure depends on contentType:
     *
     * For "interactive_buttons":
     * {
     *   "header": "Optional header text",
     *   "body": "Main message body",
     *   "footer": "Optional footer text",
     *   "buttons": [
     *     { "id": "btn_1", "title": "Button 1" },
     *     { "id": "btn_2", "title": "Button 2" }
     *   ]
     * }
     *
     * For "interactive_list":
     * {
     *   "header": "Optional header",
     *   "body": "Main message body",
     *   "footer": "Optional footer",
     *   "buttonText": "View Options",
     *   "sections": [
     *     {
     *       "title": "Section 1",
     *       "rows": [
     *         { "id": "row_1", "title": "Option 1", "description": "Description" }
     *       ]
     *     }
     *   ]
     * }
     */
    private Map<String, Object> interactiveData;
}
