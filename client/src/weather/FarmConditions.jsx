import { useState } from 'react'
import { SEVERITY } from '../lib/constants'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Meter } from '../ui/Bits'
import Reveal from '../ui/Reveal'

export default function FarmConditions({ intelligence, onOpenScan, lang = 'en' }) {
  if (!intelligence) return null

  const { overall, matrix, photoRequest, timeline, comparison, actions, cropStage } = intelligence
  const sev = SEVERITY[overall.tone] || SEVERITY.green

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------- 1. OVERALL FARM CONDITION HERO */}
      <Reveal>
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border-2 p-5 transition-all sm:p-6 shadow-card',
            sev.ring,
            sev.wash,
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className={cn('grid h-12 w-12 flex-none place-items-center rounded-2xl shadow-sm text-on-accent', sev.bg)}>
                <Icon name="sprout" size={24} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="lbl text-ink-3">
                    {lang === 'hi' ? 'निरंतर खेत स्थिति' : 'Continuous Farm Intelligence'}
                  </span>
                  {cropStage && (
                    <span className="rounded-md bg-surface/80 px-2 py-0.5 font-mono text-[11px] font-bold text-accent shadow-xs">
                      {cropStage.label} · Day {cropStage.days ?? 0}
                    </span>
                  )}
                </div>
                <h3 className="text-subheading font-bold text-ink text-[20px] sm:text-[22px] tracking-tight">
                  🌱 {lang === 'hi' ? 'खेत स्थिति: ' : 'Farm Condition: '}
                  <span className={cn(sev.text)}>{overall.label}</span>
                </h3>
              </div>
            </div>

            <span className={cn('rounded-full px-3.5 py-1 text-caption font-bold shadow-xs border', sev.ring, sev.bg, 'text-on-sev')}>
              ● {overall.label}
            </span>
          </div>

          <p className="mt-3.5 max-w-[70ch] text-body-sm font-medium leading-relaxed text-ink">
            {overall.headline}
          </p>
        </div>
      </Reveal>

      {/* -------------------------------------------------- 2. INTELLIGENT PHOTO REQUEST BANNER */}
      {photoRequest?.recommended && (
        <Reveal delay={30}>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-accent bg-accent-soft p-4.5 shadow-card sm:p-5">
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-accent text-on-accent shadow-sm animate-bounce-short">
                <Icon name="camera" size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold font-mono text-on-accent">
                    {lang === 'hi' ? 'स्मार्ट फोटो सुझाव' : 'AI PHOTO TRIGGER'}
                  </span>
                  <span className="lbl text-accent font-semibold">{photoRequest.title}</span>
                </div>
                <p className="mt-1 text-data leading-relaxed text-ink font-medium">
                  {photoRequest.reason}
                </p>
              </div>
            </div>

            {onOpenScan && (
              <button
                type="button"
                onClick={onOpenScan}
                className="flex flex-none items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-caption font-bold text-on-accent shadow-md transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Icon name="camera" size={16} />
                <span>{lang === 'hi' ? 'कैमरा खोलें व जाँचें' : 'Take Photo & Check'}</span>
                <span>→</span>
              </button>
            )}
          </div>
        </Reveal>
      )}

      {/* -------------------------------------------------- 3. TODAY'S SITUATION MATRIX */}
      <Reveal delay={60}>
        <Card>
          <CardHead
            title={lang === 'hi' ? 'आज की कृषि स्थिति' : "Today's Farm Situation"}
            meta={lang === 'hi' ? 'मौसम + खेत ऑटो-अपडेट' : 'Auto-updated from live weather'}
          />
          <CardBody className="p-0">
            <div className="grid grid-cols-1 divide-y divide-line-soft sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-3">
              {matrix.map((item) => {
                const itemSev = SEVERITY[item.tone] || SEVERITY.green
                return (
                  <div key={item.key} className="p-4 sm:p-5 space-y-1.5 transition-colors hover:bg-sunk/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="lbl text-ink-3 font-semibold">{item.title}</span>
                      <span className={cn('h-2 w-2 rounded-full flex-none', itemSev.bg)} />
                    </div>
                    <div className={cn('text-subheading font-bold text-[17px]', itemSev.text)}>
                      {item.value}
                    </div>
                    <p className="text-data leading-snug text-ink-2 text-[12.5px]">
                      {item.desc}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      </Reveal>

      {/* -------------------------------------------------- 4. TODAY'S ACTIONS + TIMELINE */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Actions */}
        <Reveal delay={90}>
          <Card className="h-full">
            <CardHead
              title={lang === 'hi' ? 'आज के मुख्य कदम' : "Today's Recommended Actions"}
              meta={`${actions.length} ${lang === 'hi' ? 'निर्देश' : 'Directives'}`}
            />
            <CardBody className="space-y-3">
              {actions.length === 0 ? (
                <p className="text-data text-ink-3">
                  {lang === 'hi' ? 'मौसम शांत है — खेत में कोई विशेष हस्तक्षेप आवश्यक नहीं।' : 'Conditions are optimal. Normal field operations can proceed.'}
                </p>
              ) : (
                actions.map((act, i) => (
                  <div key={act.text + i} className="flex items-start gap-3 rounded-xl border border-line-soft bg-sunk/40 p-3">
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-accent font-mono text-[11px] font-bold text-on-accent">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-caption font-bold text-ink">{act.text}</span>
                      <span className="mt-0.5 block text-data text-ink-2">{act.why}</span>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </Reveal>

        {/* Farm Timeline & Memory */}
        <Reveal delay={110}>
          <Card className="h-full">
            <CardHead
              title={lang === 'hi' ? 'खेत टाइमलाइन एवं स्मृति' : 'Farm Timeline & Memory'}
              meta={lang === 'hi' ? `${timeline.length} घटनाएँ दर्ज` : `${timeline.length} events logged`}
            />
            <CardBody className="space-y-3">
              {timeline.length === 0 ? (
                <p className="text-data text-ink-3">
                  {lang === 'hi' ? 'अभी कोई घटना दर्ज नहीं है। नए मौसम व फोटो स्कैन यहाँ जुड़ेंगे।' : 'No timeline events yet. Weather changes and scans will appear here automatically.'}
                </p>
              ) : (
                <ol className="relative border-l border-line-soft pl-4 space-y-4">
                  {timeline.map((item) => {
                    const itemSev = SEVERITY[item.tone] || SEVERITY.green
                    return (
                      <li key={item.id} className="relative">
                        <span
                          className={cn(
                            'absolute -left-[22px] top-1 grid h-5 w-5 place-items-center rounded-full border bg-surface text-[10px]',
                            itemSev.ring,
                            itemSev.text,
                          )}
                        >
                          <Icon name={item.icon || 'leaf'} size={11} />
                        </span>
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-caption font-bold text-ink">{item.title}</span>
                            <span className="font-mono text-[11px] text-ink-3">{item.time}</span>
                          </div>
                          <p className="mt-0.5 text-data text-ink-2 text-[12px]">{item.desc}</p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
        </Reveal>
      </div>

      {/* -------------------------------------------------- 5. VISUAL PROGRESSION & COMPARISON */}
      {comparison && (
        <Reveal delay={130}>
          <Card>
            <CardHead
              title={lang === 'hi' ? 'फोटो परिवर्तन एवं रोग प्रगति विश्लेषण' : 'Visual Foliage Tracking & Change Detection'}
              meta={lang === 'hi' ? 'दो स्कैन तुलना' : '2-Scan Comparison'}
            />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-sunk/40 p-3.5">
                  <span className="lbl text-ink-3">{lang === 'hi' ? 'पिछला स्कैन' : 'Previous Observation'}</span>
                  <div className="mt-1 text-subheading font-bold text-ink">{comparison.previous.prediction}</div>
                  <span className="font-mono text-[11px] text-ink-3">{new Date(comparison.previous.at).toLocaleDateString()}</span>
                </div>
                <div className="rounded-xl border border-accent bg-accent-soft/30 p-3.5">
                  <span className="lbl text-accent font-semibold">{lang === 'hi' ? 'ताज़ा स्कैन' : 'Latest Observation'}</span>
                  <div className="mt-1 text-subheading font-bold text-ink">{comparison.current.prediction}</div>
                  <span className="font-mono text-[11px] text-ink-3">{new Date(comparison.current.at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="rounded-xl border border-line-soft bg-surface p-3.5">
                <div className="text-caption font-bold text-ink">
                  🔍 {lang === 'hi' ? 'एआई अंतर्दृष्टि: ' : 'AI Observation: '}
                  <span className="font-normal text-ink-2">{comparison.insight}</span>
                </div>
                {comparison.weatherCorrelation && (
                  <p className="mt-1.5 text-data text-accent font-medium leading-relaxed">
                    🌧️ {comparison.weatherCorrelation}
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </Reveal>
      )}
    </div>
  )
}
