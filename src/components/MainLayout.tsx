'use client';

import "@ant-design/v5-patch-for-react-19";

import React from 'react';
import { Layout, Menu, Avatar, Badge } from 'antd';
import {
    MessageOutlined,
    DashboardOutlined,
    UserOutlined,
    SettingOutlined,
    WhatsAppOutlined,
    ProjectOutlined,
    RobotOutlined,
    SoundOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { MenuProps } from 'antd';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

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
        label: 'Panel',
    },
    {
        key: '/pipeline',
        icon: <ProjectOutlined />,
        label: 'Satış Hunisi',
    },
    {
        key: '/inbox',
        icon: <MessageOutlined />,
        label: 'Gelen Kutusu',
    },
    {
        key: '/salesbot',
        icon: <RobotOutlined />,
        label: 'Satış Botu',
    },
    {
        key: '/broadcasting',
        icon: <SoundOutlined />,
        label: 'Toplu Mesaj',
    },
    {
        key: '/contacts',
        icon: <UserOutlined />,
        label: 'Rehber',
    },
    {
        key: '/test-whatsapp',
        icon: <WhatsAppOutlined />,
        label: 'WhatsApp Test',
    },
    {
        key: '/settings',
        icon: <SettingOutlined />,
        label: 'Ayarlar',
    },
    {
        key: '/settings/ai',
        icon: <RobotOutlined />,
        label: 'AI Eğitimi',
    },
    {
        key: '/settings/forms',
        icon: <ProjectOutlined />,
        label: 'Formlar',
    },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleMenuClick: MenuProps['onClick'] = (e) => {
        router.push(e.key);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    if (pathname === '/login') {
        return <>{children}</>;
    }

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, lineHeight: '1.2' }}>{user?.email?.split('@')[0]}</span>
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>{user?.email}</span>
                        </div>
                        <Badge dot>
                            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} onClick={handleLogout} />
                        </Badge>
                    </div>
                </Header>
                <Content style={{ padding: 24, background: '#f5f5f5' }}>{children}</Content>
            </Layout>
        </Layout>
    );
}
