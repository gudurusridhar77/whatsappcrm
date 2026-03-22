import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  Handle,
  Position,
  MarkerType,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAuth } from '../../contexts/AuthContext';
import { chatbotFlowsApi, ChatbotFlowResponse } from '../../api/chatbotFlows';

// ============================================================
// Custom Node Components
// ============================================================

const nodeColors: Record<string, { bg: string; border: string; header: string }> = {
  start: { bg: '#f0fdf4', border: '#86efac', header: '#059669' },
  send_message: { bg: '#eff6ff', border: '#93c5fd', header: '#2563eb' },
  menu: { bg: '#fef3c7', border: '#fcd34d', header: '#d97706' },
  wait_for_reply: { bg: '#f3e8ff', border: '#c084fc', header: '#7c3aed' },
  collect_input: { bg: '#fce7f3', border: '#f9a8d4', header: '#db2777' },
  condition: { bg: '#fff7ed', border: '#fdba74', header: '#ea580c' },
  assign_agent: { bg: '#ecfdf5', border: '#6ee7b7', header: '#059669' },
  assign_team: { bg: '#ecfdf5', border: '#6ee7b7', header: '#047857' },
  close_conversation: { bg: '#fef2f2', border: '#fca5a5', header: '#dc2626' },
  end: { bg: '#f1f5f9', border: '#94a3b8', header: '#475569' },
};

const nodeIcons: Record<string, string> = {
  start: '▶',
  send_message: '💬',
  menu: '📋',
  wait_for_reply: '⏳',
  collect_input: '📝',
  condition: '🔀',
  assign_agent: '👤',
  assign_team: '👥',
  close_conversation: '🔒',
  end: '⏹',
};

interface NodeEditorProps {
  node: Node | null;
  onUpdate: (id: string, data: Record<string, any>) => void;
  onClose: () => void;
}

const NodeEditor: React.FC<NodeEditorProps> = ({ node, onUpdate, onClose }) => {
  if (!node) return null;
  const data = node.data as Record<string, any>;
  const type = node.type || '';

  const updateField = (key: string, value: any) => {
    onUpdate(node.id, { ...data, [key]: value });
  };

  return (
    <div style={editorStyles.panel}>
      <div style={editorStyles.header}>
        <span>{nodeIcons[type]} {data.label || type}</span>
        <button onClick={onClose} style={editorStyles.closeBtn}>&times;</button>
      </div>
      <div style={editorStyles.body}>
        <div style={editorStyles.field}>
          <label style={editorStyles.label}>Label</label>
          <input value={data.label || ''} onChange={e => updateField('label', e.target.value)}
            style={editorStyles.input} />
        </div>

        {(type === 'send_message' || type === 'end' || type === 'close_conversation'
          || type === 'assign_agent' || type === 'assign_team') && (
          <div style={editorStyles.field}>
            <label style={editorStyles.label}>Message</label>
            <textarea value={data.message || ''} onChange={e => updateField('message', e.target.value)}
              style={{ ...editorStyles.input, minHeight: '80px', fontFamily: 'inherit' }}
              placeholder="Enter the bot message... Use {{contact_name}}, {{variable}} for dynamic values" />
          </div>
        )}

        {type === 'menu' && (
          <>
            <div style={editorStyles.field}>
              <label style={editorStyles.label}>Menu Prompt</label>
              <textarea value={data.message || ''} onChange={e => updateField('message', e.target.value)}
                style={{ ...editorStyles.input, minHeight: '60px', fontFamily: 'inherit' }}
                placeholder="Please choose an option:" />
            </div>
            <div style={editorStyles.field}>
              <label style={editorStyles.label}>Options</label>
              {(data.options || []).map((opt: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <input value={opt.label || ''} style={{ ...editorStyles.input, flex: 1 }}
                    placeholder={`Option ${i + 1}`}
                    onChange={e => {
                      const opts = [...(data.options || [])];
                      opts[i] = { ...opts[i], label: e.target.value, value: e.target.value.toLowerCase(), handle: `option_${i}` };
                      updateField('options', opts);
                    }} />
                  <button onClick={() => {
                    const opts = (data.options || []).filter((_: any, j: number) => j !== i);
                    updateField('options', opts);
                  }} style={{ ...editorStyles.closeBtn, fontSize: '14px' }}>&times;</button>
                </div>
              ))}
              <button onClick={() => {
                const opts = [...(data.options || [])];
                const idx = opts.length;
                opts.push({ label: '', value: '', handle: `option_${idx}` });
                updateField('options', opts);
              }} style={editorStyles.addBtn}>+ Add Option</button>
            </div>
          </>
        )}

        {(type === 'wait_for_reply' || type === 'collect_input') && (
          <>
            <div style={editorStyles.field}>
              <label style={editorStyles.label}>Prompt Message</label>
              <textarea value={data.message || ''} onChange={e => updateField('message', e.target.value)}
                style={{ ...editorStyles.input, minHeight: '60px', fontFamily: 'inherit' }}
                placeholder="What would you like to ask?" />
            </div>
            <div style={editorStyles.field}>
              <label style={editorStyles.label}>Store response as variable</label>
              <input value={data.variableName || ''} onChange={e => updateField('variableName', e.target.value)}
                style={editorStyles.input} placeholder="e.g. customer_name, email" />
            </div>
          </>
        )}

        {type === 'condition' && (
          <>
            <div style={editorStyles.field}>
              <label style={editorStyles.label}>Variable to check</label>
              <input value={data.variable || ''} onChange={e => updateField('variable', e.target.value)}
                style={editorStyles.input} placeholder="e.g. last_menu_selection" />
            </div>
            <div style={editorStyles.field}>
              <label style={editorStyles.label}>Conditions</label>
              {(data.conditions || []).map((cond: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '6px', alignItems: 'center' }}>
                  <select value={cond.operator || 'contains'} style={{ ...editorStyles.input, width: '110px' }}
                    onChange={e => {
                      const conds = [...(data.conditions || [])];
                      conds[i] = { ...conds[i], operator: e.target.value };
                      updateField('conditions', conds);
                    }}>
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="not_contains">not contains</option>
                    <option value="starts_with">starts with</option>
                  </select>
                  <input value={cond.value || ''} style={{ ...editorStyles.input, flex: 1 }}
                    placeholder="Value"
                    onChange={e => {
                      const conds = [...(data.conditions || [])];
                      conds[i] = { ...conds[i], value: e.target.value, handle: `cond_${i}` };
                      updateField('conditions', conds);
                    }} />
                  <button onClick={() => {
                    const conds = (data.conditions || []).filter((_: any, j: number) => j !== i);
                    updateField('conditions', conds);
                  }} style={{ ...editorStyles.closeBtn, fontSize: '14px' }}>&times;</button>
                </div>
              ))}
              <button onClick={() => {
                const conds = [...(data.conditions || [])];
                conds.push({ operator: 'contains', value: '', handle: `cond_${conds.length}` });
                updateField('conditions', conds);
              }} style={editorStyles.addBtn}>+ Add Condition</button>
              <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                Each condition creates an output handle. Add a "default" edge for the else branch.
              </p>
            </div>
          </>
        )}

        {type === 'assign_agent' && (
          <div style={editorStyles.field}>
            <label style={editorStyles.label}>Agent ID (optional, blank = any available)</label>
            <input value={data.agentId || ''} onChange={e => updateField('agentId', e.target.value)}
              style={editorStyles.input} placeholder="Leave empty to let system assign" />
          </div>
        )}

        {type === 'assign_team' && (
          <div style={editorStyles.field}>
            <label style={editorStyles.label}>Team ID</label>
            <input value={data.teamId || ''} onChange={e => updateField('teamId', e.target.value)}
              style={editorStyles.input} placeholder="Team ID" />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Custom Node Renderer
// ============================================================

const FlowNodeComponent: React.FC<NodeProps> = ({ id, data, type, selected }) => {
  const nodeType = type || 'start';
  const colors = nodeColors[nodeType] || nodeColors.start;
  const nodeData = data as Record<string, any>;

  return (
    <div style={{
      background: colors.bg,
      border: `2px solid ${selected ? '#1b72e8' : colors.border}`,
      borderRadius: '8px',
      minWidth: '200px',
      maxWidth: '260px',
      boxShadow: selected ? '0 0 0 2px rgba(27,114,232,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Input handle (top) */}
      {nodeType !== 'start' && (
        <Handle type="target" position={Position.Top}
          style={{ width: 10, height: 10, backgroundColor: colors.header }} />
      )}

      {/* Header */}
      <div style={{
        padding: '6px 10px',
        backgroundColor: colors.header,
        color: '#fff',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span>{nodeIcons[nodeType]}</span>
        <span>{nodeType.replace(/_/g, ' ').toUpperCase()}</span>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px', fontSize: '12px', color: '#333' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{nodeData.label || nodeType}</div>
        {nodeData.message && (
          <div style={{
            fontSize: '11px', color: '#666', maxHeight: '60px', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'pre-wrap',
          }}>
            {(nodeData.message as string).substring(0, 100)}{(nodeData.message as string).length > 100 ? '...' : ''}
          </div>
        )}
        {nodeType === 'menu' && nodeData.options && (
          <div style={{ marginTop: '4px' }}>
            {(nodeData.options as any[]).map((opt: any, i: number) => (
              <div key={i} style={{
                fontSize: '10px', padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.7)',
                borderRadius: '3px', marginBottom: '2px',
              }}>
                {i + 1}. {opt.label || `Option ${i + 1}`}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output handles */}
      {nodeType === 'menu' && nodeData.options ? (
        (nodeData.options as any[]).map((opt: any, i: number) => (
          <Handle key={i} type="source" position={Position.Bottom} id={opt.handle || `option_${i}`}
            style={{
              width: 8, height: 8, backgroundColor: colors.header,
              left: `${((i + 1) / ((nodeData.options as any[]).length + 1)) * 100}%`,
            }} />
        ))
      ) : nodeType === 'condition' && nodeData.conditions ? (
        <>
          {(nodeData.conditions as any[]).map((cond: any, i: number) => (
            <Handle key={i} type="source" position={Position.Bottom} id={cond.handle || `cond_${i}`}
              style={{
                width: 8, height: 8, backgroundColor: colors.header,
                left: `${((i + 1) / ((nodeData.conditions as any[]).length + 2)) * 100}%`,
              }} />
          ))}
          <Handle type="source" position={Position.Bottom} id="default"
            style={{
              width: 8, height: 8, backgroundColor: '#9ca3af',
              left: `${(((nodeData.conditions as any[]).length + 1) / ((nodeData.conditions as any[]).length + 2)) * 100}%`,
            }} />
        </>
      ) : nodeType !== 'end' && nodeType !== 'assign_agent' && nodeType !== 'assign_team'
        && nodeType !== 'close_conversation' ? (
        <Handle type="source" position={Position.Bottom}
          style={{ width: 10, height: 10, backgroundColor: colors.header }} />
      ) : null}
    </div>
  );
};

// ============================================================
// Main Builder Component
// ============================================================

const ChatbotFlowBuilderPage: React.FC = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { currentAccountId } = useAuth();

  const [flow, setFlow] = useState<ChatbotFlowResponse | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const nodeTypes = useMemo(() => ({
    start: FlowNodeComponent,
    send_message: FlowNodeComponent,
    menu: FlowNodeComponent,
    wait_for_reply: FlowNodeComponent,
    collect_input: FlowNodeComponent,
    condition: FlowNodeComponent,
    assign_agent: FlowNodeComponent,
    assign_team: FlowNodeComponent,
    close_conversation: FlowNodeComponent,
    end: FlowNodeComponent,
  }), []);

  // Load flow
  useEffect(() => {
    if (!currentAccountId || !flowId) return;
    chatbotFlowsApi.getFlow(currentAccountId, parseInt(flowId)).then(res => {
      setFlow(res.data);
      if (res.data.flowData) {
        setNodes(res.data.flowData.nodes || []);
        setEdges((res.data.flowData.edges || []).map(e => ({
          ...e,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2 },
        })));
      }
    }).catch(() => setError('Failed to load flow'));
  }, [currentAccountId, flowId, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge({
      ...params,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeUpdate = useCallback((id: string, newData: Record<string, any>) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: newData } : n));
    setSelectedNode(prev => prev && prev.id === id ? { ...prev, data: newData } : prev);
  }, [setNodes]);

  const addNode = useCallback((type: string) => {
    const id = `${type}_${Date.now()}`;
    const defaultData: Record<string, any> = { label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };

    if (type === 'send_message') defaultData.message = 'Enter your message here...';
    if (type === 'menu') { defaultData.message = 'Please choose:'; defaultData.options = [{ label: 'Option 1', value: 'option_1', handle: 'option_0' }]; }
    if (type === 'wait_for_reply') { defaultData.message = 'Please reply:'; defaultData.variableName = ''; }
    if (type === 'collect_input') { defaultData.message = 'Please provide your info:'; defaultData.variableName = ''; }
    if (type === 'condition') { defaultData.variable = ''; defaultData.conditions = [{ operator: 'contains', value: '', handle: 'cond_0' }]; }
    if (type === 'assign_agent') defaultData.message = 'Connecting you to an agent...';
    if (type === 'assign_team') defaultData.message = 'Transferring you to our team...';
    if (type === 'close_conversation') defaultData.message = 'Thank you! This conversation has been closed.';
    if (type === 'end') defaultData.message = 'Goodbye!';

    const newNode: Node = {
      id,
      type,
      position: { x: 250 + Math.random() * 100, y: 200 + Math.random() * 200 },
      data: defaultData,
    };
    setNodes(nds => [...nds, newNode]);
  }, [setNodes]);

  const deleteNode = useCallback(() => {
    if (!selectedNode || selectedNode.type === 'start') return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    if (!currentAccountId || !flowId) return;
    setSaving(true);
    setError('');
    try {
      // Clean edge data for save (remove styling)
      const cleanEdges = edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
      }));
      await chatbotFlowsApi.updateFlow(currentAccountId, parseInt(flowId), {
        flowData: { nodes: nodes as any, edges: cleanEdges as any },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save flow');
    } finally {
      setSaving(false);
    }
  }, [currentAccountId, flowId, nodes, edges]);

  if (!flow) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Loading flow builder...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 70px)' }}>
      {/* Toolbar */}
      <div style={toolbarStyles.bar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/chatbot')} style={toolbarStyles.backBtn}>&larr; Back</button>
          <h3 style={{ margin: 0, fontSize: '15px' }}>{flow.name}</h3>
          <span style={{
            padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
            backgroundColor: flow.active ? '#d1fae5' : '#f3f4f6',
            color: flow.active ? '#059669' : '#888',
          }}>{flow.active ? 'Active' : 'Draft'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {error && <span style={{ color: '#dc2626', fontSize: '13px' }}>{error}</span>}
          {saved && <span style={{ color: '#059669', fontSize: '13px' }}>Saved!</span>}
          {selectedNode && selectedNode.type !== 'start' && (
            <button onClick={deleteNode} style={{ ...toolbarStyles.btn, color: '#dc2626', borderColor: '#fca5a5' }}>
              Delete Node
            </button>
          )}
          <button onClick={handleSave} disabled={saving}
            style={{ ...toolbarStyles.btn, backgroundColor: '#1b72e8', color: '#fff', border: 'none', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save Flow'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Node Palette */}
        <div style={paletteStyles.panel}>
          <div style={paletteStyles.title}>Add Nodes</div>
          {[
            { type: 'send_message', label: '💬 Send Message' },
            { type: 'menu', label: '📋 Menu / Buttons' },
            { type: 'wait_for_reply', label: '⏳ Wait for Reply' },
            { type: 'collect_input', label: '📝 Collect Input' },
            { type: 'condition', label: '🔀 Condition' },
            { type: 'assign_agent', label: '👤 Assign to Agent' },
            { type: 'assign_team', label: '👥 Assign to Team' },
            { type: 'close_conversation', label: '🔒 Close Conversation' },
            { type: 'end', label: '⏹ End Flow' },
          ].map(item => (
            <button key={item.type} onClick={() => addNode(item.type)} style={paletteStyles.nodeBtn}>
              {item.label}
            </button>
          ))}
          <div style={{ marginTop: '16px', fontSize: '11px', color: '#888', lineHeight: 1.4 }}>
            <strong>Tips:</strong><br />
            • Click a node to edit<br />
            • Drag handles to connect<br />
            • Menu options create multiple outputs<br />
            • Use {'{{contact_name}}'} in messages
          </div>
        </div>

        {/* Flow Canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.3}
            maxZoom={2}
            defaultEdgeOptions={{
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { strokeWidth: 2 },
            }}
          >
            <Background gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const c = nodeColors[n.type || 'start'];
                return c ? c.header : '#888';
              }}
              style={{ borderRadius: '6px' }}
            />
          </ReactFlow>
        </div>

        {/* Node Editor Panel */}
        {selectedNode && (
          <NodeEditor
            node={selectedNode}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// Styles
// ============================================================

const toolbarStyles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 16px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb',
    zIndex: 10,
  },
  backBtn: {
    padding: '4px 10px', backgroundColor: '#f3f4f6', border: '1px solid #ddd',
    borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
  },
  btn: {
    padding: '6px 14px', backgroundColor: '#fff', border: '1px solid #ddd',
    borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
  },
};

const paletteStyles: Record<string, React.CSSProperties> = {
  panel: {
    width: '180px', backgroundColor: '#fafafa', borderRight: '1px solid #e5e7eb',
    padding: '12px', overflowY: 'auto',
  },
  title: {
    fontSize: '12px', fontWeight: 600, color: '#666', textTransform: 'uppercase',
    marginBottom: '10px', letterSpacing: '0.5px',
  },
  nodeBtn: {
    display: 'block', width: '100%', padding: '8px 10px', marginBottom: '6px',
    backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px',
    cursor: 'pointer', fontSize: '12px', textAlign: 'left', transition: 'all 0.15s',
  },
};

const editorStyles: Record<string, React.CSSProperties> = {
  panel: {
    width: '300px', backgroundColor: '#fff', borderLeft: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: '14px',
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888',
    padding: '0 4px',
  },
  body: {
    padding: '12px', overflowY: 'auto', flex: 1,
  },
  field: { marginBottom: '12px' },
  label: {
    display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500, color: '#555',
  },
  input: {
    width: '100%', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px',
    fontSize: '13px', boxSizing: 'border-box' as const,
  },
  addBtn: {
    padding: '4px 10px', backgroundColor: '#f3f4f6', border: '1px solid #ddd',
    borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#1b72e8',
  },
};

export default ChatbotFlowBuilderPage;
