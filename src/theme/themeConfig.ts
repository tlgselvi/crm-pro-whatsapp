import { theme, type ThemeConfig } from 'antd';

const themeConfig: ThemeConfig = {
    algorithm: theme.darkAlgorithm,
    token: {
        colorBgBase: '#131314',
        colorBgContainer: '#1e1f20',
        colorBorder: '#444746',
        colorTextBase: '#e3e3e3',
        colorTextSecondary: '#c4c7c5',
        colorPrimary: '#a8c7fa',
        colorInfo: '#a8c7fa',
        colorSuccess: '#c2e7ff', // Pastel blue success
        colorWarning: '#f28b82',
        colorError: '#f28b82',
        borderRadius: 12,
        fontFamily: "'Inter', 'Roboto', sans-serif",
    },
    components: {
        Button: {
            borderRadius: 9999, // Pill-shaped buttons
            fontWeight: 500,
            controlHeight: 36,
            paddingInline: 24,
        },
        Menu: {
            itemSelectedBg: '#044265', // Google Selected Blue (Dark context)
            itemSelectedColor: '#c2e7ff',
            itemHoverBg: '#28292a',
            subMenuItemBg: 'transparent',
        },
        Card: {
            boxShadow: 'none',
            colorBorderSecondary: '#444746',
        },
        Input: {
            colorBgContainer: '#28292a',
            colorBorder: 'transparent',
            hoverBorderColor: '#a8c7fa',
            activeBorderColor: '#a8c7fa',
            borderRadius: 8,
        },
        Select: {
            colorBgContainer: '#28292a',
            colorBorder: 'transparent',
        },
        Layout: {
            colorBgHeader: '#1e1f20',
            colorBgBody: '#131314',
            colorBgTrigger: '#1e1f20',
        }
    },
};

export default themeConfig;
