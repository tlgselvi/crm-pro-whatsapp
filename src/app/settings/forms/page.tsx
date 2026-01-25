'use client';

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Space, Typography, Table, App, Modal, Divider, Badge } from 'antd';
import { ProjectOutlined, CodeOutlined, CopyOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function FormsPage() {
    const [forms, setForms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [selectedForm, setSelectedForm] = useState<any>(null);

    useEffect(() => {
        fetchForms();
    }, []);

    async function fetchForms() {
        setLoading(true);
        const { data, error } = await supabase.from('forms').select('*');
        if (error) message.error('Hata: ' + error.message);
        else setForms(data || []);
        setLoading(false);
    }

    const onFinish = async (values: any) => {
        setLoading(true);
        const { error } = await supabase.from('forms').insert([{
            title: values.title,
            settings: {
                successMessage: values.successMessage || 'Teşekkürler!',
                buttonText: values.buttonText || 'Gönder'
            }
        }]);

        if (error) message.error('Hata: ' + error.message);
        else {
            message.success('Form oluşturuldu');
            setIsModalOpen(false);
            form.resetFields();
            fetchForms();
        }
        setLoading(false);
    };

    const deleteForm = async (id: string) => {
        const { error } = await supabase.from('forms').delete().eq('id', id);
        if (error) message.error('Hata');
        else fetchForms();
    };

    const generateEmbedCode = (formId: string) => {
        const baseUrl = window.location.origin;
        return `
<!-- CRM Pro Lead Form -->
<div id="crm-form-${formId}"></div>
<script>
(function() {
  const container = document.getElementById('crm-form-${formId}');
  const iframe = document.createElement('iframe');
  iframe.src = '${baseUrl}/public-form/${formId}';
  iframe.style.width = '100%';
  iframe.style.height = '450px';
  iframe.style.border = 'none';
  container.appendChild(iframe);
})();
</script>
        `.trim();
    };

    const showEmbed = (record: any) => {
        setSelectedForm(record);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        message.success('Kod kopyalandı!');
    };

    const columns = [
        { title: 'Form Başlığı', dataIndex: 'title', key: 'title' },
        { title: 'Oluşturulma', dataIndex: 'created_at', key: 'created_at', render: (date: any) => new Date(date).toLocaleDateString() },
        {
            title: 'İşlemler',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    <Button icon={<CodeOutlined />} onClick={() => showEmbed(record)}>Kod Al</Button>
                    <Button danger icon={<DeleteOutlined />} onClick={() => deleteForm(record.id)} />
                </Space>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2}><ProjectOutlined /> Web Form Oluşturucu</Title>
                    <Text type="secondary">Sitenizde lead toplamak için formlar oluşturun ve gömün.</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Yeni Form</Button>
            </div>

            <Card>
                <Table
                    dataSource={forms}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                />
            </Card>

            <Modal
                title="Yeni Form Oluştur"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item name="title" label="Form Başlığı" rules={[{ required: true }]}>
                        <Input placeholder="Örn: İletişim Formu" />
                    </Form.Item>
                    <Form.Item name="buttonText" label="Buton Yazısı" initialValue="Gönder">
                        <Input />
                    </Form.Item>
                    <Form.Item name="successMessage" label="Başarı Mesajı" initialValue="Mesajınız alındı!">
                        <Input />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>Oluştur</Button>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Yerleştirme Kodu"
                open={!!selectedForm}
                onCancel={() => setSelectedForm(null)}
                footer={[
                    <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={() => copyToClipboard(generateEmbedCode(selectedForm.id))}>
                        Kodu Kopyala
                    </Button>
                ]}
                width={600}
            >
                <Paragraph>Aşağıdaki kodu web sitenizin HTML koduna, formun görünmesini istediğiniz yere yapıştırın.</Paragraph>
                <TextArea
                    rows={10}
                    readOnly
                    value={selectedForm ? generateEmbedCode(selectedForm.id) : ''}
                    style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}
                />
            </Modal>
        </div>
    );
}
