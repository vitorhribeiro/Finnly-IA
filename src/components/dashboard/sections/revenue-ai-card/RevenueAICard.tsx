import React, { useState } from 'react'
import { Sparkles, HeartPulse, AlertTriangle, Clock3, TrendingDown, PieChart, ShieldAlert, ChevronRight, Activity, ArrowRight } from 'lucide-react'
import { RevenueAIInsightModel, RevenueAIContextPayload } from './revenueAITypes'
import { revenueAIToneConfig } from './revenueAIToneConfig'

interface RevenueAICardProps {
  model: RevenueAIInsightModel
  onAsk: (question: string, context?: RevenueAIContextPayload) => void
  contextPayloadBase: Omit<RevenueAIContextPayload, 'selectedSuggestionId'>
}

export function RevenueAICard({ model, onAsk, contextPayloadBase }: RevenueAICardProps) {
  const config = revenueAIToneConfig[model.tone]
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleActionClick = (actionId: string, prompt: string) => {
    if (loadingAction) return
    setLoadingAction(actionId)
    const context: RevenueAIContextPayload = {
      ...contextPayloadBase,
      selectedSuggestionId: actionId
    }
    
    // Slight delay to show loading state before opening drawer
    setTimeout(() => {
      onAsk(prompt, context)
      setLoadingAction(null)
    }, 400)
  }

  const getBadgeIcon = () => {
    switch (model.tone) {
      case 'critical': return <AlertTriangle size={12} strokeWidth={3} />
      case 'attention': return <Clock3 size={12} strokeWidth={3} />
      case 'neutral': return <TrendingDown size={12} strokeWidth={3} />
      case 'positive': return <HeartPulse size={12} strokeWidth={3} />
      default: return <Sparkles size={12} strokeWidth={3} />
    }
  }

  const getInsightIcon = () => {
    switch (model.tone) {
      case 'critical': return <ShieldAlert size={18} strokeWidth={2.5} color={config.accent} />
      case 'attention': return <PieChart size={18} strokeWidth={2.5} color={config.accent} />
      case 'neutral': return <TrendingDown size={18} strokeWidth={2.5} color={config.accent} />
      case 'positive': return <Activity size={18} strokeWidth={2.5} color={config.accent} />
      default: return <Sparkles size={18} strokeWidth={2.5} color={config.accent} />
    }
  }

  return (
    <div
      className="revenue-ai-card"
      style={{
        background: config.background,
        border: `1px solid ${config.border}`,
        borderRadius: 24,
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 8px 32px rgba(0,0,0,0.2), inset 0 1px 1px ${config.glow}`,
        transition: 'all 400ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: config.primaryButtonBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: config.primaryButtonShadow
          }}>
            <Sparkles size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.5 }}>
            FINNLY IA
          </span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: config.badgeBg,
          padding: '6px 12px',
          borderRadius: 100,
          color: config.badgeText,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5
        }}>
          {getBadgeIcon()}
          {model.badge}
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
          {model.title}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          {model.description}
        </p>
      </div>

      {/* INSIGHT PANEL */}
      <div style={{
        background: config.innerPanelBg,
        border: config.innerPanelBorder,
        borderRadius: 16,
        padding: '16px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start'
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: config.accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          {getInsightIcon()}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5, fontWeight: 500 }}>
          {model.insight.split(model.highlightedMetric || '---').map((part, i, arr) => (
            <React.Fragment key={i}>
              {part}
              {i < arr.length - 1 && model.highlightedMetric && (
                <span style={{ color: config.accentStrong, fontWeight: 700 }}>
                  {model.highlightedMetric}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
        <button
          onClick={() => handleActionClick(model.primaryAction.id, model.primaryAction.prompt)}
          disabled={loadingAction !== null}
          style={{
            width: '100%',
            background: config.primaryButtonBg,
            border: 'none',
            borderRadius: 14,
            padding: '14px 20px',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: loadingAction ? 'not-allowed' : 'pointer',
            boxShadow: config.primaryButtonShadow,
            transition: 'all 200ms ease',
            opacity: loadingAction ? 0.7 : 1
          }}
          onMouseEnter={(e) => {
            if (loadingAction) return;
            e.currentTarget.style.background = config.primaryButtonHover
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            if (loadingAction) return;
            e.currentTarget.style.background = config.primaryButtonBg
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} />
            {loadingAction === model.primaryAction.id ? 'Analisando...' : model.primaryAction.label}
          </div>
          <ChevronRight size={16} />
        </button>

        {model.secondaryActions.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {model.secondaryActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action.id, action.prompt)}
                disabled={loadingAction !== null}
                style={{
                  flex: '1 1 calc(50% - 5px)',
                  background: 'transparent',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  color: 'var(--text-soft)',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: loadingAction ? 'not-allowed' : 'pointer',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  if (loadingAction) return;
                  e.currentTarget.style.borderColor = config.accent
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={(e) => {
                  if (loadingAction) return;
                  e.currentTarget.style.borderColor = 'var(--line-soft)'
                  e.currentTarget.style.color = 'var(--text-soft)'
                }}
              >
                {loadingAction === action.id ? 'Gerando...' : action.label}
                <ArrowRight size={14} style={{ opacity: 0.5 }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
