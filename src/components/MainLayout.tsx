'use client';

import React from 'react';
import { Layout, Menu, Avatar, Badge } from 'antd';
import {
    MessageOutlined,
    DashboardOutlined,
    UserOutlined,
    SettingOutlined,
    WhatsAppOutlined,
    ProjectOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;


interface MenuItemType {
    key: string;
    icon: React.ReactNode;
    label: string;
}

const items: MenuItemType[] = [
    {
        key: '/dashboard',
        icon: <DashboardOutlined />,
        label: 'Dashboard',
    },
    {
        key: '/pipeline',
        icon: <ProjectOutlined />,
        label: 'Pipeline',
    },
    {
        key: '/inbox',
        icon: <MessageOutlined />,
        label: 'Inbox',
    },
    {
        key: '/contacts',
        icon: <UserOutlined />,
        label: 'Contacts',
    },
    {
        key: '/settings',
        icon: <SettingOutlined />,
        label: 'Settings',
    },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleMenuClick: MenuProps['onClick'] = (e) => {
        router.push(e.key);
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                theme="light"
                width={240}
                style={{
                    borderRight: '1px solid #f0f0f0',
                }}
            >
                <div
                    style={{
                        height: 64,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 24px',
                        borderBottom: '1px solid #f0f0f0',
                    }}
                >
                    <WhatsAppOutlined style={{ fontSize: 24, color: '#25D366', marginRight: 12 }} />
                    <span style={{ fontSize: 18, fontWeight: 600 }}>CRM Pro</span>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={items as MenuProps['items']}
                    onClick={handleMenuClick}
                    style={{ border: 'none', marginTop: 16 }}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        background: '#fff',
                        padding: '0 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #f0f0f0',
                    }}
                >
                    <div style={{ fontSize: 16, fontWeight: 500 }}>
                        {items.find((item) => item.key === pathname)?.label || 'CRM'}
                    </div>
                    <Badge dot>
                        <Avatar icon={<UserOutlined />} />
                    </Badge>
                </Header>
                <Content style={{ padding: 24, background: '#f5f5f5' }}>{children}</Content>
            </Layout>
        </Layout>
    );
}
