'use client';

import React, { useEffect, useState } from 'react';
import { Card, Avatar, Tag, Typography, Spin, Empty, Badge } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase, type Contact } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STAGES = [
    { id: 'new', name: 'Yeni Gelenler', color: '#1890ff' },
    { id: 'contacted', name: 'İletişim Kuruldu', color: '#52c41a' },
    { id: 'qualified', name: 'Nitelikli Lead', color: '#faad14' },
    { id: 'proposal', name: 'Teklif Gönderildi', color: '#722ed1' },
    { id: 'negotiation', name: 'Pazarlık', color: '#eb2f96' },
    { id: 'won', name: 'Satış Kapatıldı', color: '#52c41a' },
    { id: 'lost', name: 'Kaybedildi', color: '#ff4d4f' },
];

interface PipelineData {
    [key: string]: Contact[];
}

export default function PipelinePage() {
    const [contacts, setContacts] = useState<PipelineData>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContacts();

        // Real-time subscription
        const channel = supabase
            .channel('pipeline_contacts')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contacts',
                },
                () => {
                    fetchContacts();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchContacts() {
        try {
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group contacts by stage
            const grouped: PipelineData = {};
            STAGES.forEach((stage) => {
                grouped[stage.id] = [];
            });

            data?.forEach((contact) => {
                if (grouped[contact.stage]) {
                    grouped[contact.stage].push(contact);
                }
            });

            setContacts(grouped);
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoading(false);
        }
    }

    async function onDragEnd(result: DropResult) {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        const newStage = destination.droppableId;

        // Update Supabase
        try {
            const { error } = await supabase
                .from('contacts')
                .update({ stage: newStage })
                .eq('id', draggableId);

            if (error) throw error;

            // Optimistically update UI
            const newContacts = { ...contacts };
            const [movedContact] = newContacts[source.droppableId].splice(source.index, 1);
            movedContact.stage = newStage;
            newContacts[destination.droppableId].splice(destination.index, 0, movedContact);
            setContacts(newContacts);
        } catch (error) {
            console.error('Error updating contact stage:', error);
        }
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Satış Hunisi</Title>

            <DragDropContext onDragEnd={onDragEnd}>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                    {STAGES.map((stage) => (
                        <div
                            key={stage.id}
                            style={{
                                minWidth: 320,
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: 16,
                                padding: 16,
                                height: 'fit-content',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            {/* Column Header */}
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text strong style={{ fontSize: 15, color: 'var(--text-main)' }}>
                                        {stage.name}
                                    </Text>

                                    <Badge
                                        count={contacts[stage.id]?.length || 0}
                                        showZero
                                        color={stage.color}
                                        style={{ backgroundColor: stage.color, boxShadow: `0 0 10px ${stage.color}44` }}
                                    />
                                </div>
                            </div>

                            {/* Droppable Column */}
                            <Droppable droppableId={stage.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            minHeight: 500,
                                            background: snapshot.isDraggingOver ? 'rgba(59, 130, 246, 0.03)' : 'transparent',
                                            borderRadius: 12,
                                            transition: 'all 0.2s ease',
                                            padding: '4px'
                                        }}
                                    >
                                        {contacts[stage.id]?.length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={<Text type="secondary">Boş</Text>}
                                                style={{ padding: '60px 0' }}
                                            />
                                        ) : (
                                            contacts[stage.id]?.map((contact, index) => (
                                                <Draggable key={contact.id} draggableId={contact.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className="glass-card"
                                                            variant="borderless"
                                                            style={{
                                                                marginBottom: 16,
                                                                cursor: 'grab',
                                                                ...provided.draggableProps.style,
                                                            }}
                                                            size="small"
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                                                <Avatar
                                                                    icon={<UserOutlined />}
                                                                    size={44}
                                                                    style={{
                                                                        backgroundColor: '#28292a',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-secondary)'
                                                                    }}
                                                                />
                                                                <div style={{ flex: 1 }}>
                                                                    <Text strong style={{ display: 'block', fontSize: 14, color: 'var(--text-main)' }}>
                                                                        {contact.name}
                                                                    </Text>
                                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                                                        <PhoneOutlined style={{ marginRight: 6, fontSize: 10 }} />
                                                                        {contact.phone}
                                                                    </div>

                                                                    {contact.email && (
                                                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                                                            <MailOutlined style={{ marginRight: 6, fontSize: 10 }} />
                                                                            {contact.email}
                                                                        </div>
                                                                    )}
                                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                                                                        {dayjs(contact.created_at).format('DD MMM')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    )}
                                                </Draggable>
                                            ))
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
