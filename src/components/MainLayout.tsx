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
    TeamOutlined,
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
        key: '/marketing',
        icon: <SoundOutlined />,
        label: 'Pazarlama',
    },
    {
        key: '/contacts',
        icon: <UserOutlined />,
        label: 'Rehber',
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
    {
        key: '/settings/team',
        icon: <TeamOutlined />,
        label: 'Takım',
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
                width={280}
                style={{
                    borderRight: '1px solid #e2e8f0',
                    background: '#ffffff'
                }}
            >
                <div
                    style={{
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 32px',
                        borderBottom: '1px solid #f1f5f9',
                    }}
                >
                    <img
                        src="/crm_pro_logo_platinum.png"
                        alt="CRM Pro"
                        style={{ height: 42, width: 'auto', marginRight: 12, borderRadius: 8 }}
                    />
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px' }}>CRM Pro</span>
                </div>
                <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={items as MenuProps['items']}
                    onClick={handleMenuClick}
                    style={{ border: 'none', marginTop: 24, padding: '0 12px' }}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                        padding: '0 40px',
                        height: 80,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #f1f5f9',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000
                    }}
                >
                    <div className="text-gradient" style={{ fontSize: 22, fontWeight: 600 }}>
                        {items.find((item) => item.key === pathname)?.label || 'CRM'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{user?.email?.split('@')[0]}</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{user?.email}</span>
                        </div>
                        <Badge dot color="#25D366">
                            <Avatar
                                icon={<UserOutlined />}
                                size={44}
                                style={{
                                    cursor: 'pointer',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    color: '#64748b'
                                }}
                                onClick={handleLogout}
                            />
                        </Badge>
                    </div>
                </Header>
                <Content style={{ padding: '40px', background: '#f8fafc' }}>
                    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                        {children}
                    </div>
                </Content>
            </Layout>
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .ant-menu-item {
                    height: 48px !important;
                    line-height: 48px !important;
                    margin-bottom: 8px !important;
                    border-radius: 12px !important;
                }
                .ant-menu-item-selected {
                    background: rgba(59, 130, 246, 0.1) !important;
                    color: #2563eb !important;
                }
                .ant-menu-item-icon {
                    font-size: 18px !important;
                }
            `}</style>
        </Layout>
    );
}
