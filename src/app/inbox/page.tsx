'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Typography } from 'antd';

const { Title } = Typography;
import ConversationList from '@/components/ConversationList';
import MessageThread from '@/components/MessageThread';
import type { ConversationWithContact } from '@/lib/supabase';

export default function InboxPage() {
    const [selectedConversation, setSelectedConversation] = useState<ConversationWithContact | null>(null);

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <Row gutter={[24, 24]} style={{ height: 'calc(100vh - 120px)' }}>
                <Col span={8}>
                    <Card
                        title={<Title level={4} style={{ margin: 0 }}>Sohbetler</Title>}
                        className="glass-card"
                        variant="borderless"
                        styles={{ body: { padding: '12px 0', height: 'calc(100vh - 200px)', overflow: 'auto' } }}
                    >
                        <ConversationList
                            onSelectConversation={setSelectedConversation}
                            selectedId={selectedConversation?.id}
                        />
                    </Card>
                </Col>
                <Col span={16}>
                    <Card
                        className="glass-card"
                        variant="borderless"
                        styles={{ body: { padding: 0, height: 'calc(100vh - 120px)' } }}
                    >
                        <MessageThread conversation={selectedConversation} />
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
