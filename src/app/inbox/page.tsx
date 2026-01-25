'use client';

import React, { useState } from 'react';
import { Card, Row, Col } from 'antd';
import ConversationList from '@/components/ConversationList';
import MessageThread from '@/components/MessageThread';
import type { ConversationWithContact } from '@/lib/supabase';

export default function InboxPage() {
    const [selectedConversation, setSelectedConversation] = useState<ConversationWithContact | null>(null);

    return (
        <Row gutter={16} style={{ height: 'calc(100vh - 112px)' }}>
            <Col span={8}>
                <Card
                    title="Conversations"
                    variant="borderless"
                    styles={{ body: { padding: 0, height: 'calc(100vh - 176px)', overflow: 'auto' } }}
                >
                    <ConversationList
                        onSelectConversation={setSelectedConversation}
                        selectedId={selectedConversation?.id}
                    />
                </Card>
            </Col>
            <Col span={16}>
                <Card variant="borderless" styles={{ body: { padding: 0, height: 'calc(100vh - 176px)' } }}>
                    <MessageThread conversation={selectedConversation} />
                </Card>
            </Col>
        </Row>
    );
}
