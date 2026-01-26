'use client';

import "@ant-design/v5-patch-for-react-19";

import React, { useEffect, useState } from 'react';
import { Layout, Menu, Avatar, Badge, Popover, List, Typography, Button as AntButton } from 'antd';
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
    NodeIndexOutlined,
    BellOutlined,
    RocketOutlined,
    BookOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { MenuProps } from 'antd';
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
        key: '/dashboard/automations',
        icon: <NodeIndexOutlined />,
        label: 'Otomasyon',
    },
    {
        key: '/salesbot',
        icon: <RobotOutlined />,
        label: 'Satış Botu',
    },
    {
        key: '/dashboard/broadcast',
        icon: <SoundOutlined />,
        label: 'Duyuru Merkezi',
    },
    {
        key: '/dashboard/simulator',
        icon: <RocketOutlined />,
        label: 'Test Asistanı',
    },
    {
        key: '/contacts',
        icon: <UserOutlined />,
        label: 'Rehber',
    },
    {
        key: '/dashboard/knowledge',
        icon: <BookOutlined />,
        label: 'Eğitim (AI)',
    },
    {
        key: '/settings',
        icon: <SettingOutlined />,
        label: 'Ayarlar',
    },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [mounted, setMounted] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        const initialize = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) fetchNotifications(user.id);
        };
        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) fetchNotifications(currentUser.id);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchNotifications = async (userId: string) => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(5);
        setNotifications(data || []);
    };

    const handleMenuClick: MenuProps['onClick'] = (e) => {
        router.push(e.key);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    if (!mounted) return null;
    if (pathname === '/login') return <>{children}</>;

    const notificationContent = (
        <List
            size="small"
            dataSource={notifications}
            style={{ width: 300 }}
            renderItem={(item) => (
                <List.Item
                    onClick={() => router.push(item.link || '#')}
                    style={{ cursor: 'pointer' }}
                >
                    <List.Item.Meta
                        title={<span style={{ fontSize: 13 }}>{item.title}</span>}
                        description={<span style={{ fontSize: 12 }}>{item.message}</span>}
                    />
                </List.Item>
            )}
            locale={{ emptyText: 'Yeni bildirim yok' }}
            footer={
                notifications.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <AntButton type="link" size="small">Tümünü Gör</AntButton>
                    </div>
                )
            }
        />
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider
                theme="dark"
                width={280}
                style={{
                    borderRight: 'var(--glass-border)',
                    background: 'var(--container-bg)',
                    backdropFilter: 'blur(var(--glass-blur))',
                    WebkitBackdropFilter: 'blur(var(--glass-blur))',
                }}
            >
                <div style={{ height: 80, display: 'flex', alignItems: 'center', padding: '0 32px', borderBottom: 'var(--glass-border)' }}>
                    <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-main)' }}>CRM Pro</span>
                </div>

                <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={items as MenuProps['items']}
                    onClick={handleMenuClick}
                    style={{ border: 'none', marginTop: 24, padding: '0 12px', background: 'transparent' }}
                />
            </Sider>

            <Layout style={{ background: 'var(--background)' }}>
                <Header style={{
                    background: 'var(--container-bg)',
                    backdropFilter: 'blur(var(--glass-blur))',
                    WebkitBackdropFilter: 'blur(var(--glass-blur))',
                    padding: '0 40px',
                    height: 80,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: 'var(--glass-border)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000
                }}>
                    <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-main)' }}>
                        {items.find((item) => item.key === pathname)?.label || 'Duyuru Merkezi'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <Popover placement="bottomRight" title="Son Bildirimler" content={notificationContent} trigger="click">
                            <Badge count={notifications.length} size="small" color="var(--primary-pastel)">
                                <BellOutlined style={{ fontSize: 22, color: 'var(--text-secondary)', cursor: 'pointer' }} />
                            </Badge>
                        </Popover>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-main)' }}>{user?.email?.split('@')[0]}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user?.email}</span>
                        </div>

                        <Avatar
                            icon={<UserOutlined />}
                            size={40}
                            style={{ cursor: 'pointer', background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                            onClick={handleLogout}
                        />
                    </div>
                </Header>

                <Content style={{ padding: '40px', background: 'var(--background)' }}>
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
                    border-radius: 12px !important;
                    margin-bottom: 8px !important;
                }
                .ant-menu-item-selected {
                    background: rgba(168, 199, 250, 0.1) !important;
                }
            `}</style>
        </Layout>
    );
}
