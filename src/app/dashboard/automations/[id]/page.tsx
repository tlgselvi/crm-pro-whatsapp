'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, addEdge, Connection, Edge, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button, Layout, Typography, Space, Input, Switch, message, App, Spin, Tag } from 'antd';
import { SaveOutlined, ArrowLeftOutlined, PlayCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import FlowSidebar from '@/components/FlowSidebar';

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

// ... (Node Definitions remain same) ...
const TriggerNode = ({ data }: any) => (
    <div style={{
        padding: '10px 20px',
        background: '#1d4ed8',
        color: 'white',
        borderRadius: 8,
        border: '1px solid #1e40af',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
        <strong>⚡ Tetikleyici:</strong> {data.label}
    </div>
);

const QuestionNode = ({ data }: any) => (
    <div style={{
        padding: '10px 20px',
        background: '#7c3aed', // Purple
        color: 'white',
        borderRadius: 8,
        border: '1px solid #6d28d9',
        minWidth: 150,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
        <div style={{ fontSize: 12, color: '#ddd', marginBottom: 4 }}>❓ Soru</div>
        <strong>{data.label}</strong>
        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.8 }}>Var: {data.variable}</div>
    </div>
);

const MessageNode = ({ data }: any) => (
    <div style={{
        padding: '10px 20px',
        background: '#fff',
        color: '#333',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        minWidth: 150,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>💬 Mesaj</div>
        {data.label}
    </div>
);

const nodeTypes: NodeTypes = {
    trigger: TriggerNode,
    message: MessageNode,
    question: QuestionNode,
};

export default function FlowEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { message: msg } = App.useApp();

    // ... (State) ...
    const [workflow, setWorkflow] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // ReactFlow State
    const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);

    useEffect(() => {
        if (params.id) fetchWorkflow(params.id as string);
    }, [params.id]);

    async function fetchWorkflow(id: string) {
        setLoading(true);
        // ... (Fetch Logic Same) ...
        const { data: flowData, error: flowError } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (flowError) {
            msg.error('Akış bulunamadı');
            router.push('/dashboard/automations');
            return;
        }

        setWorkflow(flowData);

        const { data: nodesData } = await supabase.from('workflow_nodes').select('*').eq('workflow_id', id);
        const { data: edgesData } = await supabase.from('workflow_edges').select('*').eq('workflow_id', id);

        if (nodesData && nodesData.length > 0) {
            const restoredNodes = nodesData.map(n => ({
                id: n.id,
                type: n.type,
                position: { x: n.position_x, y: n.position_y },
                data: { ...n.content, label: n.label, triggerType: n.content?.trigger_type }
            }));
            const restoredEdges = edgesData?.map(e => ({
                id: e.id,
                source: e.source_node_id,
                target: e.target_node_id,
                sourceHandle: e.source_handle
            })) || [];

            setNodes(restoredNodes);
            setEdges(restoredEdges);
        } else {
            setNodes([{
                id: 'start-node',
                type: 'trigger',
                position: { x: 250, y: 50 },
                data: { label: 'Başlangıç', triggerType: 'keyword' }
            }]);
        }
        setLoading(false);
    }
    const HandoverNode = ({ data }: any) => (
        <div style={{
            padding: '10px 20px',
            background: '#ef4444', // Red
            color: 'white',
            borderRadius: 8,
            border: '1px solid #dc2626',
            minWidth: 150,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 4 }}>👮‍♂️ İnsana Aktar</div>
            <strong>{data.label}</strong>
        </div>
    );

    const AINode = ({ data }: any) => (
        <div style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', // Cyan to Blue Aurora
            color: 'white',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            minWidth: 150,
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{ fontSize: 12, color: '#e0f2fe', marginBottom: 4 }}>🤖 AI Zekası</div>
            <strong>{data.label}</strong>
            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.8 }}>RAG: Aktif</div>
        </div>
    );

    const nodeTypes: NodeTypes = {
        trigger: TriggerNode,
        message: MessageNode,
        question: QuestionNode,
        handover: HandoverNode,
        ai_agent: AINode,
    };

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    // Node Selection
    const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
        setSelectedNodeId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // Node Updates from Sidebar
    const handleUpdateNode = (id: string, data: any) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            })
        );
    };

    // Add New Node
    const addNode = (type: string) => {
        const id = `${type}-${Date.now()}`; // Simple ID generation
        const newNode = {
            id,
            type,
            position: { x: 250, y: 200 + (nodes.length * 50) },
            data: {
                label: type === 'message' ? 'Yeni Mesaj' : type === 'question' ? 'Soru Sor' : type === 'handover' ? 'Temsilciye Aktar' : 'Yeni Adım',
                variable: type === 'question' ? 'contact_name' : undefined
            },
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(id);
    };

    const deleteNode = (id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setSelectedNodeId(null);
    };

    const handleSave = async () => {
        if (!workflow) return;
        setSaving(true);

        // 1. Metadata
        await supabase.from('workflows').update({
            updated_at: new Date().toISOString()
        }).eq('id', workflow.id);

        // 2. Nodes
        await supabase.from('workflow_nodes').delete().eq('workflow_id', workflow.id);
        const dbNodes = nodes.map(n => ({
            id: n.id,
            workflow_id: workflow.id,
            type: n.type || 'message',
            label: n.data.label,
            content: n.data,
            position_x: n.position.x,
            position_y: n.position.y
        }));
        await supabase.from('workflow_nodes').insert(dbNodes);

        // 3. Edges
        await supabase.from('workflow_edges').delete().eq('workflow_id', workflow.id);
        const dbEdges = edges.map(e => ({
            id: e.id,
            workflow_id: workflow.id,
            source_node_id: e.source,
            target_node_id: e.target,
            source_handle: e.sourceHandle
        }));
        await supabase.from('workflow_edges').insert(dbEdges);

        setSaving(false);
        msg.success('Otomasyon kaydedildi');
    };

    if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>;

    const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

    return (
        <Layout style={{ height: '100vh' }}>
            <Header style={{
                background: 'var(--container-bg)',
                borderBottom: 'var(--glass-border)',
                padding: '0 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 64
            }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/dashboard/automations')} type="text" />
                    <Text strong style={{ fontSize: 16, color: 'var(--text-main)' }}>{workflow?.name}</Text>
                    <Tag color={workflow?.is_active ? "green" : "orange"}>{workflow?.is_active ? "Yayında" : "Taslak"}</Tag>
                </Space>
                <Space>
                    <Button onClick={() => addNode('message')}>+ Mesaj</Button>
                    <Button onClick={() => addNode('question')} style={{ color: '#7c3aed', borderColor: '#7c3aed' }}>+ Soru</Button>
                    <Button onClick={() => addNode('ai_agent')} style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', color: 'white', border: 'none' }}>+ AI Zekası</Button>
                    <Button onClick={() => addNode('handover')} danger>+ Aktar</Button>
                    <Button onClick={() => addNode('delay')}>+ Gecikme</Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        loading={saving}
                    >
                        Kaydet
                    </Button>
                </Space>
            </Header>

            <Layout>
                <Content style={{ height: '100%', background: '#09090b' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        colorMode="dark"
                        fitView
                    >
                        <Background />
                        <Controls />
                    </ReactFlow>
                </Content>

                <Sider
                    width={320}
                    theme="light"
                    style={{
                        borderLeft: 'var(--glass-border)',
                        background: 'var(--container-bg)',
                        backdropFilter: 'blur(20px)'
                    }}
                >
                    <FlowSidebar
                        selectedNode={selectedNode}
                        onUpdateNode={handleUpdateNode}
                        onDeleteNode={deleteNode}
                    />
                </Sider>
            </Layout>
        </Layout>
    );
}
