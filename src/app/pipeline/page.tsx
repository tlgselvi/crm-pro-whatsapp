'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Card, Avatar, Tag, Typography, Spin, Empty, Badge,
    Drawer, Descriptions, Select, Input, Popconfirm, Divider, Button, Tooltip, Space
} from 'antd';
import {
    UserOutlined, PhoneOutlined, MailOutlined, DeleteOutlined,
    FireOutlined, ThunderboltOutlined, ClockCircleOutlined,
    MessageOutlined, CalendarOutlined, TeamOutlined,
    CopyOutlined, WhatsAppOutlined, SearchOutlined
} from '@ant-design/icons';
import { message as antMessage } from 'antd';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase, type Contact, type Message, type Conversation } from '@/lib/supabase';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';

dayjs.locale('tr');

const { Title, Text } = Typography;
const { TextArea } = Input;

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
    { id: 'new', name: 'Yeni Gelenler', color: '#1890ff' },
    { id: 'contacted', name: 'İletişim Kuruldu', color: '#52c41a' },
    { id: 'qualified', name: 'Nitelikli Lead', color: '#faad14' },
    { id: 'proposal', name: 'Teklif Gönderildi', color: '#722ed1' },
    { id: 'negotiation', name: 'Pazarlık', color: '#eb2f96' },
    { id: 'won', name: 'Satış Kapatıldı', color: '#52c41a' },
    { id: 'lost', name: 'Kaybedildi', color: '#ff4d4f' },
];

const TEMP_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    HOT: { color: '#ff4d4f', icon: <FireOutlined />, label: 'Sıcak' },
    WARM: { color: '#faad14', icon: <ThunderboltOutlined />, label: 'Ilık' },
    COLD: { color: '#1890ff', icon: <ClockCircleOutlined />, label: 'Soğuk' },
};

const SEGMENT_LABELS: Record<string, string> = {
    YENI_HAVUZ: 'Yeni Havuz',
    BAKIM: 'Bakım',
    MALZEME: 'Malzeme',
    TADILAT: 'Tadilat',
    SAUNA_SPA: 'Sauna / Spa',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineData {
    [key: string]: Contact[];
}

interface DrawerState {
    open: boolean;
    contact: Contact | null;
    messages: Message[];
    loadingMessages: boolean;
    notes: string;
    savingNotes: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
    const [contacts, setContacts] = useState<PipelineData>({});
    const [loading, setLoading] = useState(true);
    const [drawer, setDrawer] = useState<DrawerState>({
        open: false,
        contact: null,
        messages: [],
        loadingMessages: false,
        notes: '',
        savingNotes: false,
    });

    // ── Arama & Filtre ─────────────────────────────────────────────────────────
    const [searchText, setSearchText] = useState('');
    const [filterTemp, setFilterTemp] = useState<string | null>(null);
    const [filterStage, setFilterStage] = useState<string | null>(null);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleSearchChange(value: string) {
        setSearchText(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
    }

    function getFilteredContacts(stageId: string): Contact[] {
        const list = contacts[stageId] ?? [];
        return list.filter(c => {
            const q = debouncedSearch.toLowerCase();
            const matchSearch = !q ||
                c.name?.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q) ||
                (c.first_message ?? '').toLowerCase().includes(q);
            const matchTemp = !filterTemp || c.lead_temperature === filterTemp;
            const matchStage = !filterStage || c.stage === filterStage;
            return matchSearch && matchTemp && matchStage;
        });
    }

    // Drag guard — prevents accidental drawer opens while dragging
    const isDraggingRef = useRef(false);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    // ── Data fetching ──────────────────────────────────────────────────────────

    useEffect(() => {
        fetchContacts();

        const channel = supabase
            .channel('pipeline_contacts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
                fetchContacts();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    async function fetchContacts() {
        try {
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const grouped: PipelineData = {};
            STAGES.forEach((s) => { grouped[s.id] = []; });
            data?.forEach((c) => { if (grouped[c.stage]) grouped[c.stage].push(c); });
            setContacts(grouped);
        } catch (err) {
            console.error('Kişiler alınamadı:', err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchMessages(contact: Contact) {
        setDrawer(prev => ({ ...prev, loadingMessages: true, messages: [] }));
        try {
            // Active conversation for this contact
            const { data: convData } = await supabase
                .from('conversations')
                .select('id')
                .eq('contact_id', contact.id)
                .eq('status', 'active')
                .limit(1)
                .single();

            if (!convData) {
                setDrawer(prev => ({ ...prev, loadingMessages: false }));
                return;
            }

            const { data: msgData, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', convData.id)
                .order('timestamp', { ascending: true });

            if (error) throw error;
            setDrawer(prev => ({ ...prev, messages: msgData ?? [], loadingMessages: false }));
        } catch (err) {
            console.error('Mesajlar alınamadı:', err);
            setDrawer(prev => ({ ...prev, loadingMessages: false }));
        }
    }

    // ── Drawer open/close ──────────────────────────────────────────────────────

    function openDrawer(contact: Contact) {
        if (isDraggingRef.current) return;
        setDrawer({
            open: true,
            contact,
            messages: [],
            loadingMessages: true,
            notes: contact.notes ?? '',
            savingNotes: false,
        });
        fetchMessages(contact);
    }

    function closeDrawer() {
        setDrawer(prev => ({ ...prev, open: false, contact: null }));
    }

    // Scroll chat to bottom when messages arrive
    useEffect(() => {
        if (drawer.messages.length > 0) {
            setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [drawer.messages]);

    // ── Notes save ─────────────────────────────────────────────────────────────

    async function saveNotes() {
        if (!drawer.contact) return;
        setDrawer(prev => ({ ...prev, savingNotes: true }));
        try {
            const { error } = await supabase
                .from('contacts')
                .update({ notes: drawer.notes, updated_at: new Date().toISOString() })
                .eq('id', drawer.contact.id);

            if (error) throw error;

            // Reflect in pipeline state
            setContacts(prev => {
                const updated = { ...prev };
                const stage = drawer.contact!.stage;
                updated[stage] = updated[stage].map(c =>
                    c.id === drawer.contact!.id ? { ...c, notes: drawer.notes } : c
                );
                return updated;
            });
            antMessage.success('Not kaydedildi');
        } catch (err) {
            console.error('Not kaydedilemedi:', err);
            antMessage.error('Not kaydedilemedi');
        } finally {
            setDrawer(prev => ({ ...prev, savingNotes: false }));
        }
    }

    // ── Quick actions ──────────────────────────────────────────────────────────

    async function changeStage(newStage: string) {
        if (!drawer.contact) return;
        const oldStage = drawer.contact.stage;
        try {
            const { error } = await supabase
                .from('contacts')
                .update({ stage: newStage, updated_at: new Date().toISOString() })
                .eq('id', drawer.contact.id);

            if (error) throw error;

            setContacts(prev => {
                const updated = { ...prev };
                updated[oldStage] = updated[oldStage].filter(c => c.id !== drawer.contact!.id);
                const movedContact = { ...drawer.contact!, stage: newStage };
                updated[newStage] = [movedContact, ...updated[newStage]];
                return updated;
            });
            setDrawer(prev => ({
                ...prev,
                contact: prev.contact ? { ...prev.contact, stage: newStage } : null
            }));
            antMessage.success('Aşama güncellendi');
        } catch (err) {
            console.error(err);
            antMessage.error('Güncelleme başarısız');
        }
    }

    async function changeTemperature(temp: 'HOT' | 'WARM' | 'COLD') {
        if (!drawer.contact) return;
        try {
            const { error } = await supabase
                .from('contacts')
                .update({ lead_temperature: temp, updated_at: new Date().toISOString() })
                .eq('id', drawer.contact.id);

            if (error) throw error;

            setContacts(prev => {
                const updated = { ...prev };
                const stage = drawer.contact!.stage;
                updated[stage] = updated[stage].map(c =>
                    c.id === drawer.contact!.id ? { ...c, lead_temperature: temp } : c
                );
                return updated;
            });
            setDrawer(prev => ({
                ...prev,
                contact: prev.contact ? { ...prev.contact, lead_temperature: temp } : null
            }));
            antMessage.success('Sıcaklık güncellendi');
        } catch (err) {
            console.error(err);
            antMessage.error('Güncelleme başarısız');
        }
    }

    // ── Delete (reused from card, also callable from drawer) ──────────────────

    async function deleteContact(contactId: string, stageId: string) {
        try {
            const { data: convs } = await supabase
                .from('conversations')
                .select('id')
                .eq('contact_id', contactId);

            if (convs && convs.length > 0) {
                const convIds = convs.map(c => c.id);
                await supabase.from('messages').delete().in('conversation_id', convIds);
                await supabase.from('conversations').delete().eq('contact_id', contactId);
            }

            const { error } = await supabase
                .from('contacts')
                .delete()
                .eq('id', contactId);

            if (error) throw error;

            setContacts(prev => {
                const updated = { ...prev };
                updated[stageId] = updated[stageId].filter(c => c.id !== contactId);
                return updated;
            });

            if (drawer.contact?.id === contactId) closeDrawer();
            antMessage.success('Müşteri silindi');
        } catch (err) {
            console.error('Silme hatası:', err);
            antMessage.error('Silme başarısız');
        }
    }

    // ── Drag handlers ──────────────────────────────────────────────────────────

    function handleDragStart() {
        isDraggingRef.current = true;
    }

    async function onDragEnd(result: DropResult) {
        // Small delay before clearing the flag so onClick doesn't fire
        setTimeout(() => { isDraggingRef.current = false; }, 150);

        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStage = destination.droppableId;
        try {
            const { error } = await supabase
                .from('contacts')
                .update({ stage: newStage })
                .eq('id', draggableId);

            if (error) throw error;

            setContacts(prev => {
                const updated = { ...prev };
                const [moved] = updated[source.droppableId].splice(source.index, 1);
                moved.stage = newStage;
                updated[destination.droppableId].splice(destination.index, 0, moved);
                return updated;
            });
        } catch (err) {
            console.error('Sürükleme hatası:', err);
        }
    }

    function formatPhoneForWhatsApp(phone?: string): string {
        if (!phone) return '';
        // Sadece rakamları al, başında + veya 00 varsa koru
        const digits = phone.replace(/\D/g, '');
        // Türkiye numarası: 10 haneli → 90 ekle, 11+ haneli → olduğu gibi
        if (digits.startsWith('90')) return digits;
        if (digits.startsWith('0')) return '90' + digits.slice(1);
        if (digits.length === 10) return '90' + digits;
        return digits;
    }

    function copyPhone(phone?: string) {
        if (!phone) return;
        navigator.clipboard.writeText(phone)
            .then(() => antMessage.success('Telefon kopyalandı'))
            .catch(() => antMessage.error('Kopyalama başarısız'));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    function temperatureTag(temp?: string) {
        if (!temp || !TEMP_CONFIG[temp]) return <Tag color="default">—</Tag>;
        const cfg = TEMP_CONFIG[temp];
        return (
            <Tag color={cfg.color} icon={cfg.icon}>
                {cfg.label}
            </Tag>
        );
    }

    function stageLabel(stageId: string) {
        return STAGES.find(s => s.id === stageId)?.name ?? stageId;
    }

    // ── Loading ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Satış Hunisi</Title>

            {/* ── Arama & Filtre Toolbar ─────────────────────────────────── */}
            <div style={{
                display: 'flex',
                gap: 12,
                marginBottom: 20,
                flexWrap: 'wrap',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                padding: '12px 16px',
            }}>
                <Input
                    placeholder="İsim, telefon veya ilk mesaj ile ara…"
                    prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
                    value={searchText}
                    onChange={e => handleSearchChange(e.target.value)}
                    allowClear
                    onClear={() => { setSearchText(''); setDebouncedSearch(''); }}
                    style={{
                        flex: '1 1 240px',
                        background: '#28292a',
                        border: '1px solid var(--border-color)',
                        borderRadius: 8,
                        color: 'var(--text-main)',
                    }}
                />
                <Select
                    placeholder="🌡️ Sıcaklık"
                    allowClear
                    value={filterTemp}
                    onChange={val => setFilterTemp(val ?? null)}
                    style={{ minWidth: 140 }}
                    options={[
                        { value: 'HOT', label: '🔥 Sıcak' },
                        { value: 'WARM', label: '⚡ Ilık' },
                        { value: 'COLD', label: '❄️ Soğuk' },
                    ]}
                />
                <Select
                    placeholder="📊 Aşama"
                    allowClear
                    value={filterStage}
                    onChange={val => setFilterStage(val ?? null)}
                    style={{ minWidth: 180 }}
                    options={STAGES.map(s => ({ value: s.id, label: s.name }))}
                />
                {(searchText || filterTemp || filterStage) && (
                    <Button
                        size="small"
                        onClick={() => {
                            setSearchText('');
                            setDebouncedSearch('');
                            setFilterTemp(null);
                            setFilterStage(null);
                        }}
                        style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)', borderRadius: 8 }}
                    >
                        Filtreyi Temizle
                    </Button>
                )}
            </div>

            <DragDropContext onDragStart={handleDragStart} onDragEnd={onDragEnd}>
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
                                        count={getFilteredContacts(stage.id).length}
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
                                        {getFilteredContacts(stage.id).length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={<Text type="secondary">Boş</Text>}
                                                style={{ padding: '60px 0' }}
                                            />
                                        ) : (
                                            getFilteredContacts(stage.id).map((contact, index) => (
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
                                                                cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
                                                                opacity: snapshot.isDragging ? 0.85 : 1,
                                                                ...provided.draggableProps.style,
                                                            }}
                                                            size="small"
                                                            onClick={() => !snapshot.isDragging && openDrawer(contact)}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                                                <Avatar
                                                                    icon={<UserOutlined />}
                                                                    size={44}
                                                                    style={{
                                                                        backgroundColor: '#28292a',
                                                                        border: '1px solid var(--border-color)',
                                                                        color: 'var(--text-secondary)',
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Text strong style={{ fontSize: 14, color: 'var(--text-main)' }}>
                                                                            {contact.name}
                                                                        </Text>
                                                                        <Popconfirm
                                                                            title="Müşteriyi sil"
                                                                            description="Bu müşteri ve tüm konuşma geçmişi silinecek."
                                                                            onConfirm={(e) => { e?.stopPropagation(); deleteContact(contact.id, stage.id); }}
                                                                            onCancel={(e) => e?.stopPropagation()}
                                                                            okText="Sil"
                                                                            cancelText="İptal"
                                                                            okButtonProps={{ danger: true }}
                                                                        >
                                                                            <DeleteOutlined
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                style={{ color: '#64748b', fontSize: 13, cursor: 'pointer', padding: 4 }}
                                                                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4d4f')}
                                                                                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                                                                            />
                                                                        </Popconfirm>
                                                                    </div>
                                                                    {/* Lead temperature tag — between name and phone */}
                                                                    {contact.lead_temperature && (
                                                                        <div style={{ marginTop: 6, marginBottom: 2 }}>
                                                                            {contact.lead_temperature === 'HOT' && (
                                                                                <Tag color="red" icon={<FireOutlined />} style={{ fontSize: 11 }}>Sıcak</Tag>
                                                                            )}
                                                                            {contact.lead_temperature === 'WARM' && (
                                                                                <Tag color="orange" style={{ fontSize: 11 }}>Ilık</Tag>
                                                                            )}
                                                                            {contact.lead_temperature === 'COLD' && (
                                                                                <Tag color="blue" style={{ fontSize: 11 }}>Soğuk</Tag>
                                                                            )}
                                                                        </div>
                                                                    )}
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
                                                                    {contact.source && (
                                                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                                                                            {contact.source}
                                                                        </div>
                                                                    )}
                                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
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

            {/* ═══════════════════════════════════════════════════════════════
                CONTACT DETAIL DRAWER
            ═══════════════════════════════════════════════════════════════ */}
            <Drawer
                open={drawer.open}
                onClose={closeDrawer}
                width={520}
                title={null}
                placement="right"
                styles={{
                    body: { padding: 0, background: '#1a1a1a' },
                    header: { display: 'none' },
                    wrapper: { boxShadow: '-4px 0 32px rgba(0,0,0,0.6)' },
                }}
            >
                {drawer.contact && (
                    <div style={{ height: '100%', overflowY: 'auto', color: 'var(--text-main)' }}>

                        {/* ── Contact Header ─────────────────────────────────── */}
                        <div style={{
                            background: 'linear-gradient(135deg, #28292a 0%, #1f2024 100%)',
                            padding: '28px 24px 20px',
                            borderBottom: '1px solid var(--border-color)',
                            position: 'relative',
                        }}>
                            {/* Close button */}
                            <button
                                onClick={closeDrawer}
                                style={{
                                    position: 'absolute', top: 16, right: 16,
                                    background: 'rgba(255,255,255,0.06)', border: 'none',
                                    borderRadius: 8, width: 32, height: 32,
                                    cursor: 'pointer', color: 'var(--text-secondary)',
                                    fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                ×
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <Avatar
                                    icon={<UserOutlined />}
                                    size={64}
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                        flexShrink: 0,
                                        fontSize: 28,
                                    }}
                                />
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                                        {drawer.contact.name}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                        <PhoneOutlined style={{ marginRight: 6 }} />
                                        {drawer.contact.phone}
                                    </div>
                                    {drawer.contact.email && (
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                                            <MailOutlined style={{ marginRight: 6 }} />
                                            {drawer.contact.email}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                                        <CalendarOutlined style={{ marginRight: 6 }} />
                                        {dayjs(drawer.contact.created_at).format('DD MMMM YYYY, HH:mm')} tarihinde eklendi
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Lead Info ─────────────────────────────────────── */}
                        <div style={{ padding: '20px 24px 0' }}>
                            <SectionTitle icon={<ThunderboltOutlined />} title="Lead Bilgileri" />
                            <div style={{
                                background: '#28292a',
                                borderRadius: 12,
                                padding: '16px',
                                border: '1px solid var(--border-color)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '14px 20px',
                            }}>
                                <InfoItem label="Sıcaklık">
                                    {temperatureTag(drawer.contact.lead_temperature)}
                                </InfoItem>
                                <InfoItem label="Lead Skoru">
                                    <Tag color={
                                        (drawer.contact.lead_score ?? 0) >= 70 ? 'success' :
                                        (drawer.contact.lead_score ?? 0) >= 40 ? 'warning' : 'default'
                                    }>
                                        {drawer.contact.lead_score ?? '—'} puan
                                    </Tag>
                                </InfoItem>
                                <InfoItem label="Segment">
                                    <Text style={{ color: 'var(--text-main)', fontSize: 13 }}>
                                        {drawer.contact.segment ? SEGMENT_LABELS[drawer.contact.segment] ?? drawer.contact.segment : '—'}
                                    </Text>
                                </InfoItem>
                                <InfoItem label="Kaynak">
                                    <Text style={{ color: 'var(--text-main)', fontSize: 13 }}>
                                        {drawer.contact.source ?? '—'}
                                    </Text>
                                </InfoItem>
                                <InfoItem label="Pipeline Aşaması" fullWidth>
                                    <Tag color="blue">{stageLabel(drawer.contact.stage)}</Tag>
                                </InfoItem>
                            </div>
                        </div>

                        {/* ── First Message ─────────────────────────────────── */}
                        {drawer.contact.first_message && (
                            <div style={{ padding: '20px 24px 0' }}>
                                <SectionTitle icon={<MessageOutlined />} title="İlk Mesaj" />
                                <div style={{
                                    background: '#28292a',
                                    borderRadius: 12,
                                    padding: '14px 16px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: 13,
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.6,
                                    fontStyle: 'italic',
                                }}>
                                    "{drawer.contact.first_message}"
                                </div>
                            </div>
                        )}

                        {/* ── Notes ─────────────────────────────────────────── */}
                        <div style={{ padding: '20px 24px 0' }}>
                            <SectionTitle icon={<span>📝</span>} title="Notlar" />
                            <TextArea
                                value={drawer.notes}
                                onChange={e => setDrawer(prev => ({ ...prev, notes: e.target.value }))}
                                onBlur={saveNotes}
                                placeholder="Not ekle… (kaydetmek için alanın dışına tıkla)"
                                autoSize={{ minRows: 3, maxRows: 6 }}
                                style={{
                                    background: '#28292a',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 12,
                                    color: 'var(--text-main)',
                                    fontSize: 13,
                                    resize: 'none',
                                }}
                            />
                            {drawer.savingNotes && (
                                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                                    Kaydediliyor…
                                </Text>
                            )}
                        </div>

                        {/* ── Conversation History ───────────────────────────── */}
                        <div style={{ padding: '20px 24px 0' }}>
                            <SectionTitle icon={<MessageOutlined />} title="Konuşma Geçmişi" />
                            <div style={{
                                background: '#28292a',
                                borderRadius: 12,
                                border: '1px solid var(--border-color)',
                                minHeight: 160,
                                maxHeight: 320,
                                overflowY: 'auto',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                            }}>
                                {drawer.loadingMessages ? (
                                    <div style={{ textAlign: 'center', padding: 40 }}>
                                        <Spin size="small" />
                                        <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Mesajlar yükleniyor…</div>
                                    </div>
                                ) : drawer.messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 13 }}>
                                        Henüz konuşma yok
                                    </div>
                                ) : (
                                    drawer.messages.map(msg => (
                                        <ChatBubble key={msg.id} message={msg} />
                                    ))
                                )}
                                <div ref={chatBottomRef} />
                            </div>
                        </div>

                        {/* ── Quick Actions ─────────────────────────────────── */}
                        <div style={{ padding: '20px 24px 24px' }}>
                            <SectionTitle icon={<span>⚡</span>} title="Hızlı İşlemler" />
                            <div style={{
                                background: '#28292a',
                                borderRadius: 12,
                                border: '1px solid var(--border-color)',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 14,
                            }}>
                                {/* Change Stage */}
                                <div>
                                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                                        Pipeline Aşaması Değiştir
                                    </Text>
                                    <Select
                                        value={drawer.contact.stage}
                                        onChange={changeStage}
                                        onSelect={changeStage}
                                        style={{ width: '100%' }}
                                        popupMatchSelectWidth={false}
                                        options={STAGES.map(s => ({ value: s.id, label: s.name }))}
                                        styles={{
                                            popup: {
                                                root: { background: '#28292a', border: '1px solid var(--border-color)' }
                                            }
                                        }}
                                    />
                                </div>

                                {/* Change Temperature */}
                                <div>
                                    <Text style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                                        Lead Sıcaklığı Değiştir
                                    </Text>
                                    <Select
                                        value={drawer.contact.lead_temperature ?? undefined}
                                        onChange={(val: 'HOT' | 'WARM' | 'COLD') => changeTemperature(val)}
                                        style={{ width: '100%' }}
                                        placeholder="Sıcaklık seç…"
                                        options={[
                                            { value: 'HOT', label: '🔥 Sıcak' },
                                            { value: 'WARM', label: '⚡ Ilık' },
                                            { value: 'COLD', label: '❄️ Soğuk' },
                                        ]}
                                    />
                                </div>

                                <Divider style={{ margin: '4px 0', borderColor: 'var(--border-color)' }} />

                                {/* WhatsApp & Copy */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <Button
                                        icon={<WhatsAppOutlined />}
                                        href={`https://wa.me/${formatPhoneForWhatsApp(drawer.contact.phone)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            flex: 1,
                                            borderRadius: 8,
                                            background: '#25D366',
                                            borderColor: '#25D366',
                                            color: '#fff',
                                        }}
                                    >
                                        WhatsApp&apos;ta Aç
                                    </Button>
                                    <Button
                                        icon={<CopyOutlined />}
                                        onClick={() => copyPhone(drawer.contact?.phone)}
                                        style={{ flex: 1, borderRadius: 8 }}
                                    >
                                        Kopyala
                                    </Button>
                                </div>

                                <Divider style={{ margin: '4px 0', borderColor: 'var(--border-color)' }} />

                                {/* Delete */}
                                <Popconfirm
                                    title="Müşteriyi kalıcı sil"
                                    description="Bu müşteri ve tüm konuşma geçmişi silinecek. Bu işlem geri alınamaz."
                                    onConfirm={() => deleteContact(drawer.contact!.id, drawer.contact!.stage)}
                                    okText="Sil"
                                    cancelText="İptal"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        block
                                        style={{ borderRadius: 8 }}
                                    >
                                        Müşteriyi Sil
                                    </Button>
                                </Popconfirm>
                            </div>
                        </div>

                    </div>
                )}
            </Drawer>
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 10, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600
        }}>
            {icon}
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</span>
        </div>
    );
}

function InfoItem({ label, children, fullWidth }: {
    label: string;
    children: React.ReactNode;
    fullWidth?: boolean;
}) {
    return (
        <div style={{ gridColumn: fullWidth ? 'span 2' : undefined }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label}
            </div>
            <div>{children}</div>
        </div>
    );
}

function ChatBubble({ message }: { message: Message }) {
    const isAgent = message.sender === 'agent';
    return (
        <div style={{
            display: 'flex',
            justifyContent: isAgent ? 'flex-end' : 'flex-start',
        }}>
            <div style={{
                maxWidth: '75%',
                background: isAgent ? 'rgba(59,130,246,0.18)' : '#1a1a1a',
                border: isAgent ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-color)',
                borderRadius: isAgent ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                padding: '8px 12px',
            }}>
                <div style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {message.content}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, textAlign: isAgent ? 'right' : 'left' }}>
                    {dayjs(message.timestamp).format('HH:mm')}
                    {isAgent && <span style={{ marginLeft: 4, color: '#3b82f6' }}>✓</span>}
                </div>
            </div>
        </div>
    );
}
