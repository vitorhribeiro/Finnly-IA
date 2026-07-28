import { RevenueAITone } from './revenueAITypes'

export type RevenueAIThemeConfig = {
  background: string
  accent: string
  accentStrong: string
  accentSoft: string
  border: string
  glow: string
  badgeBg: string
  badgeText: string
  innerPanelBg: string
  innerPanelBorder: string
  primaryButtonBg: string
  primaryButtonHover: string
  primaryButtonShadow: string
}

export const revenueAIToneConfig: Record<RevenueAITone, RevenueAIThemeConfig> = {
  critical: {
    background: 'linear-gradient(145deg, #1C0A0A 0%, #0D0303 100%)',
    accent: '#FF4D5E',
    accentStrong: '#FF3048',
    accentSoft: 'rgba(255, 77, 94, 0.14)',
    border: 'rgba(255, 77, 94, 0.38)',
    glow: 'rgba(255, 45, 68, 0.20)',
    badgeBg: 'rgba(255, 77, 94, 0.14)',
    badgeText: '#FF4D5E',
    innerPanelBg: 'rgba(255, 77, 94, 0.03)',
    innerPanelBorder: '1px solid rgba(255, 77, 94, 0.12)',
    primaryButtonBg: 'linear-gradient(90deg, #FF4D5E, #FF3048)',
    primaryButtonHover: 'linear-gradient(90deg, #FF6675, #FF4D5E)',
    primaryButtonShadow: '0 4px 14px rgba(255, 77, 94, 0.25)',
  },
  attention: {
    background: 'linear-gradient(145deg, #1C170A 0%, #0D0B03 100%)',
    accent: '#F5B82E',
    accentStrong: '#FFCA4A',
    accentSoft: 'rgba(245, 184, 46, 0.14)',
    border: 'rgba(245, 184, 46, 0.34)',
    glow: 'rgba(245, 184, 46, 0.17)',
    badgeBg: 'rgba(245, 184, 46, 0.14)',
    badgeText: '#F5B82E',
    innerPanelBg: 'rgba(245, 184, 46, 0.03)',
    innerPanelBorder: '1px solid rgba(245, 184, 46, 0.12)',
    primaryButtonBg: 'linear-gradient(90deg, #F5B82E, #E5A319)',
    primaryButtonHover: 'linear-gradient(90deg, #FFCA4A, #F5B82E)',
    primaryButtonShadow: '0 4px 14px rgba(245, 184, 46, 0.25)',
  },
  neutral: {
    background: 'linear-gradient(145deg, #0F1E1C 0%, #060F0E 100%)',
    accent: '#91A19F',
    accentStrong: '#B7C4C2',
    accentSoft: 'rgba(145, 161, 159, 0.12)',
    border: 'rgba(145, 161, 159, 0.24)',
    glow: 'rgba(116, 145, 141, 0.10)',
    badgeBg: 'rgba(145, 161, 159, 0.12)',
    badgeText: '#B7C4C2',
    innerPanelBg: 'rgba(145, 161, 159, 0.03)',
    innerPanelBorder: '1px solid rgba(145, 161, 159, 0.12)',
    primaryButtonBg: 'linear-gradient(90deg, #91A19F, #748A87)',
    primaryButtonHover: 'linear-gradient(90deg, #A8B5B3, #91A19F)',
    primaryButtonShadow: '0 4px 14px rgba(145, 161, 159, 0.15)',
  },
  positive: {
    background: 'linear-gradient(145deg, #09201C 0%, #030D0B 100%)',
    accent: '#2CD49A',
    accentStrong: '#42E7AC',
    accentSoft: 'rgba(44, 212, 154, 0.13)',
    border: 'rgba(44, 212, 154, 0.30)',
    glow: 'rgba(44, 212, 154, 0.15)',
    badgeBg: 'rgba(44, 212, 154, 0.13)',
    badgeText: '#2CD49A',
    innerPanelBg: 'rgba(44, 212, 154, 0.03)',
    innerPanelBorder: '1px solid rgba(44, 212, 154, 0.12)',
    primaryButtonBg: 'linear-gradient(90deg, #2CD49A, #1EB781)',
    primaryButtonHover: 'linear-gradient(90deg, #42E7AC, #2CD49A)',
    primaryButtonShadow: '0 4px 14px rgba(44, 212, 154, 0.25)',
  },
  empty: {
    background: 'linear-gradient(145deg, #151817 0%, #0A0D0C 100%)',
    accent: '#91A19F',
    accentStrong: '#FFFFFF',
    accentSoft: 'rgba(145, 161, 159, 0.1)',
    border: 'rgba(145, 161, 159, 0.15)',
    glow: 'rgba(255, 255, 255, 0.02)',
    badgeBg: 'rgba(255, 255, 255, 0.05)',
    badgeText: '#E2E8E7',
    innerPanelBg: 'rgba(255, 255, 255, 0.02)',
    innerPanelBorder: '1px dashed rgba(255, 255, 255, 0.1)',
    primaryButtonBg: 'linear-gradient(90deg, #2CD49A, #1EB781)',
    primaryButtonHover: 'linear-gradient(90deg, #42E7AC, #2CD49A)',
    primaryButtonShadow: '0 4px 14px rgba(44, 212, 154, 0.25)',
  }
}
