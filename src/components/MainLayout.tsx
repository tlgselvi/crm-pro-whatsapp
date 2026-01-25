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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
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
                theme="dark"
                width={280}
                style={{
                    borderRight: '1px solid #444746',
                    background: '#1e1f20'
                }}
            >
                <div
                    style={{
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 32px',
                        borderBottom: '1px solid #444746',
                    }}
                >
                    <img
                        src="/crm_pro_logo_platinum.png"
                        alt="CRM Pro"
                        style={{ height: 32, width: 'auto', marginRight: 12, borderRadius: 6, filter: 'brightness(1.2)' }}
                    />
                    <span style={{ fontSize: 18, fontWeight: 500, color: '#e3e3e3', letterSpacing: '0.2px' }}>CRM Pro</span>
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
                        background: '#1e1f20',
                        padding: '0 40px',
                        height: 80,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #444746',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000
                    }}
                >
                    <div style={{ fontSize: 20, fontWeight: 500, color: '#e3e3e3' }}>
                        {items.find((item) => item.key === pathname)?.label || 'CRM'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500, fontSize: 14, color: '#e3e3e3' }}>{user?.email?.split('@')[0]}</span>
                            <span style={{ fontSize: 12, color: '#c4c7c5' }}>{user?.email}</span>
                        </div>
                        <Badge dot color="#a8c7fa">
                            <Avatar
                                icon={<UserOutlined />}
                                size={40}
                                style={{
                                    cursor: 'pointer',
                                    background: '#28292a',
                                    border: '1px solid #444746',
                                    color: '#c4c7c5'
                                }}
                                onClick={handleLogout}
                            />
                        </Badge>
                    </div>
                </Header>
                <Content style={{ padding: '40px', background: '#131314' }}>

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
                    height: 44px !important;
                    line-height: 44px !important;
                    margin-bottom: 4px !important;
                    border-radius: 9999px !important; /* Material 3 Pill style */
                }
                .ant-menu-item-selected {
                    background: #004a77 !important;
                    color: #c2e7ff !important;
                }
                .ant-menu-item:hover {
                    background: #28292a !important;
                }
                .ant-menu-item-icon {
                    font-size: 20px !important;
                }

            `}</style>
        </Layout>
    );
}
