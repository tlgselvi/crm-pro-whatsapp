'use client';

import React, { useEffect, useState } from 'react';
import { Card, Avatar, Tag, Typography, Spin, Empty } from 'antd';
import { UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase, type Contact } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STAGES = [
    { id: 'new', name: 'Incoming', color: '#1890ff' },
    { id: 'contacted', name: 'Contacted', color: '#52c41a' },
    { id: 'qualified', name: 'Qualified', color: '#faad14' },
    { id: 'proposal', name: 'Proposal', color: '#722ed1' },
    { id: 'negotiation', name: 'Negotiation', color: '#eb2f96' },
    { id: 'won', name: 'Won', color: '#52c41a' },
    { id: 'lost', name: 'Lost', color: '#ff4d4f' },
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
            <Title level={2} style={{ marginBottom: 24 }}>Sales Pipeline</Title>

            <DragDropContext onDragEnd={onDragEnd}>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                    {STAGES.map((stage) => (
                        <div
                            key={stage.id}
                            style={{
                                minWidth: 300,
                                background: '#f5f5f5',
                                borderRadius: 8,
                                padding: 16,
                            }}
                        >
                            {/* Column Header */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text strong style={{ fontSize: 16 }}>
                                        {stage.name}
                                    </Text>
                                    <Tag color={stage.color}>{contacts[stage.id]?.length || 0}</Tag>
                                </div>
                            </div>

                            {/* Droppable Column */}
                            <Droppable droppableId={stage.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            minHeight: 400,
                                            background: snapshot.isDraggingOver ? '#e6f7ff' : 'transparent',
                                            borderRadius: 4,
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        {contacts[stage.id]?.length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description="No contacts"
                                                style={{ padding: '40px 0' }}
                                            />
                                        ) : (
                                            contacts[stage.id]?.map((contact, index) => (
                                                <Draggable key={contact.id} draggableId={contact.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            variant="outlined"
                                                            style={{
                                                                marginBottom: 12,
                                                                cursor: 'grab',
                                                                background: snapshot.isDragging ? '#fff' : '#fff',
                                                                boxShadow: snapshot.isDragging
                                                                    ? '0 8px 16px rgba(0,0,0,0.15)'
                                                                    : '0 1px 2px rgba(0,0,0,0.08)',
                                                                ...provided.draggableProps.style,
                                                            }}
                                                            size="small"
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                                                <Avatar icon={<UserOutlined />} size={40} />
                                                                <div style={{ flex: 1 }}>
                                                                    <Text strong style={{ display: 'block', marginBottom: 4 }}>
                                                                        {contact.name}
                                                                    </Text>
                                                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                                                        <PhoneOutlined style={{ marginRight: 4 }} />
                                                                        {contact.phone}
                                                                    </div>
                                                                    {contact.email && (
                                                                        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                                                                            <MailOutlined style={{ marginRight: 4 }} />
                                                                            {contact.email}
                                                                        </div>
                                                                    )}
                                                                    <div style={{ fontSize: 11, color: '#bfbfbf', marginTop: 8 }}>
                                                                        {dayjs(contact.created_at).format('MMM DD, YYYY')}
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
