'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DomainCV } from '@/domain/model/cv';
import type { 
  ConflictAnalysis, 
  ConflictResolutions, 
  ConflictResolution 
} from '@/lib/conflict';
import { 
  mergeWithResolutions, 
  acceptAllIncoming, 
  keepAllCurrent 
} from '@/lib/conflict';
import { TextConflictCard, RoleConflictCard, SkillConflictCard } from './conflict-card';

interface ConflictResolverProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved: (mergedCv: DomainCV) => void;
  currentCv: DomainCV;
  incomingCv: DomainCV;
  analysis: ConflictAnalysis;
  locale?: 'sv' | 'en';
}

export function ConflictResolver({
  isOpen,
  onClose,
  onResolved,
  currentCv,
  incomingCv,
  analysis,
  locale = 'en',
}: ConflictResolverProps) {
  const [resolutions, setResolutions] = useState<ConflictResolutions>(() => ({
    roles: {},
    skills: {},
  }));
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  const t = {
    title: locale === 'sv' ? 'Lös importkonflikter' : 'Resolve Import Conflicts',
    description: locale === 'sv' 
      ? `${analysis.totalConflicts} konflikter upptäckta mellan befintlig och importerad data`
      : `${analysis.totalConflicts} conflicts detected between existing and incoming data`,
    overview: locale === 'sv' ? 'Översikt' : 'Overview',
    roles: locale === 'sv' ? 'Roller' : 'Roles',
    skills: locale === 'sv' ? 'Kompetenser' : 'Skills',
    other: locale === 'sv' ? 'Övrigt' : 'Other',
    acceptAll: locale === 'sv' ? 'Acceptera alla inkommande' : 'Accept all incoming',
    keepAll: locale === 'sv' ? 'Behåll alla nuvarande' : 'Keep all current',
    apply: locale === 'sv' ? 'Tillämpa ändringar' : 'Apply changes',
    cancel: locale === 'sv' ? 'Avbryt' : 'Cancel',
    resolved: locale === 'sv' ? 'löst' : 'resolved',
    rolesModified: locale === 'sv' ? 'Ändrade roller' : 'Modified roles',
    rolesAdded: locale === 'sv' ? 'Nya roller' : 'New roles',
    rolesRemoved: locale === 'sv' ? 'Borttagna roller' : 'Removed roles',
    skillsModified: locale === 'sv' ? 'Ändrade kompetenser' : 'Modified skills',
    skillsAdded: locale === 'sv' ? 'Nya kompetenser' : 'New skills',
    skillsRemoved: locale === 'sv' ? 'Borttagna kompetenser' : 'Removed skills',
    noConflicts: locale === 'sv' ? 'Inga konflikter i denna sektion' : 'No conflicts in this section',
  };

  // Count resolved conflicts
  const resolvedCount = useMemo(() => {
    let count = 0;
    if (resolutions.title) count++;
    if (resolutions.summary) count++;
    count += Object.keys(resolutions.roles).length;
    count += Object.keys(resolutions.skills).length;
    return count;
  }, [resolutions]);

  // Update a specific resolution
  const setResolution = (
    section: 'title' | 'summary' | 'roles' | 'skills',
    id: string,
    resolution: ConflictResolution
  ) => {
    setResolutions(prev => {
      if (section === 'title') {
        return { ...prev, title: resolution };
      }
      if (section === 'summary') {
        return { ...prev, summary: resolution };
      }
      if (section === 'roles') {
        return { ...prev, roles: { ...prev.roles, [id]: resolution } };
      }
      if (section === 'skills') {
        return { ...prev, skills: { ...prev.skills, [id]: resolution } };
      }
      return prev;
    });
  };

  // Bulk actions
  const handleAcceptAll = () => {
    setResolutions(acceptAllIncoming(analysis));
  };

  const handleKeepAll = () => {
    setResolutions(keepAllCurrent(analysis));
  };

  // Apply resolutions
  const handleApply = () => {
    const mergedCv = mergeWithResolutions(currentCv, incomingCv, analysis, resolutions);
    onResolved(mergedCv);
  };

  // Role conflicts by type
  const modifiedRoles = analysis.conflicts.roles.filter(c => c.type === 'modified');
  const addedRoles = analysis.conflicts.roles.filter(c => c.type === 'added');
  const removedRoles = analysis.conflicts.roles.filter(c => c.type === 'removed');

  // Skill conflicts by type
  const modifiedSkills = analysis.conflicts.skills.filter(c => c.type === 'modified');
  const addedSkills = analysis.conflicts.skills.filter(c => c.type === 'added');
  const removedSkills = analysis.conflicts.skills.filter(c => c.type === 'removed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[var(--geisli-secondary)]">{t.title}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
            <div className="text-sm text-gray-500">
              {resolvedCount}/{analysis.totalConflicts} {t.resolved}
            </div>
          </div>
        </CardHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="overview">{t.overview}</TabsTrigger>
              {analysis.conflicts.roles.length > 0 && (
                <TabsTrigger value="roles">
                  {t.roles} ({analysis.conflicts.roles.length})
                </TabsTrigger>
              )}
              {analysis.conflicts.skills.length > 0 && (
                <TabsTrigger value="skills">
                  {t.skills} ({analysis.conflicts.skills.length})
                </TabsTrigger>
              )}
              {(analysis.conflicts.title || analysis.conflicts.summary) && (
                <TabsTrigger value="other">{t.other}</TabsTrigger>
              )}
            </TabsList>
            
            <div className="flex-1 overflow-y-auto p-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {analysis.stats.rolesModified > 0 && (
                    <StatCard label={t.rolesModified} count={analysis.stats.rolesModified} color="amber" />
                  )}
                  {analysis.stats.rolesAdded > 0 && (
                    <StatCard label={t.rolesAdded} count={analysis.stats.rolesAdded} color="green" />
                  )}
                  {analysis.stats.rolesRemoved > 0 && (
                    <StatCard label={t.rolesRemoved} count={analysis.stats.rolesRemoved} color="red" />
                  )}
                  {analysis.stats.skillsModified > 0 && (
                    <StatCard label={t.skillsModified} count={analysis.stats.skillsModified} color="amber" />
                  )}
                  {analysis.stats.skillsAdded > 0 && (
                    <StatCard label={t.skillsAdded} count={analysis.stats.skillsAdded} color="green" />
                  )}
                  {analysis.stats.skillsRemoved > 0 && (
                    <StatCard label={t.skillsRemoved} count={analysis.stats.skillsRemoved} color="red" />
                  )}
                </div>
                
                {/* Bulk actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleKeepAll}>
                    {t.keepAll}
                  </Button>
                  <Button 
                    onClick={handleAcceptAll}
                    className="bg-[var(--geisli-accent)] hover:bg-[var(--geisli-accent)]/90"
                  >
                    {t.acceptAll}
                  </Button>
                </div>
              </TabsContent>
              
              {/* Roles Tab */}
              <TabsContent value="roles" className="mt-0 space-y-4">
                {modifiedRoles.length > 0 && (
                  <Section title={t.rolesModified}>
                    {modifiedRoles.map(conflict => (
                      <RoleConflictCard
                        key={conflict.id}
                        conflict={conflict}
                        locale={locale}
                        resolution={resolutions.roles[conflict.id]}
                        onResolve={(r) => setResolution('roles', conflict.id, r)}
                      />
                    ))}
                  </Section>
                )}
                {addedRoles.length > 0 && (
                  <Section title={t.rolesAdded}>
                    {addedRoles.map(conflict => (
                      <RoleConflictCard
                        key={conflict.id}
                        conflict={conflict}
                        locale={locale}
                        resolution={resolutions.roles[conflict.id]}
                        onResolve={(r) => setResolution('roles', conflict.id, r)}
                      />
                    ))}
                  </Section>
                )}
                {removedRoles.length > 0 && (
                  <Section title={t.rolesRemoved}>
                    {removedRoles.map(conflict => (
                      <RoleConflictCard
                        key={conflict.id}
                        conflict={conflict}
                        locale={locale}
                        resolution={resolutions.roles[conflict.id]}
                        onResolve={(r) => setResolution('roles', conflict.id, r)}
                      />
                    ))}
                  </Section>
                )}
                {analysis.conflicts.roles.length === 0 && (
                  <p className="text-gray-500 text-center py-8">{t.noConflicts}</p>
                )}
              </TabsContent>
              
              {/* Skills Tab */}
              <TabsContent value="skills" className="mt-0 space-y-4">
                {modifiedSkills.length > 0 && (
                  <Section title={t.skillsModified}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modifiedSkills.map(conflict => (
                        <SkillConflictCard
                          key={conflict.id}
                          conflict={conflict}
                          locale={locale}
                          resolution={resolutions.skills[conflict.id]}
                          onResolve={(r) => setResolution('skills', conflict.id, r)}
                        />
                      ))}
                    </div>
                  </Section>
                )}
                {addedSkills.length > 0 && (
                  <Section title={t.skillsAdded}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {addedSkills.map(conflict => (
                        <SkillConflictCard
                          key={conflict.id}
                          conflict={conflict}
                          locale={locale}
                          resolution={resolutions.skills[conflict.id]}
                          onResolve={(r) => setResolution('skills', conflict.id, r)}
                        />
                      ))}
                    </div>
                  </Section>
                )}
                {removedSkills.length > 0 && (
                  <Section title={t.skillsRemoved}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {removedSkills.map(conflict => (
                        <SkillConflictCard
                          key={conflict.id}
                          conflict={conflict}
                          locale={locale}
                          resolution={resolutions.skills[conflict.id]}
                          onResolve={(r) => setResolution('skills', conflict.id, r)}
                        />
                      ))}
                    </div>
                  </Section>
                )}
                {analysis.conflicts.skills.length === 0 && (
                  <p className="text-gray-500 text-center py-8">{t.noConflicts}</p>
                )}
              </TabsContent>
              
              {/* Other Tab (title, summary) */}
              <TabsContent value="other" className="mt-0 space-y-4">
                {analysis.conflicts.title && (
                  <TextConflictCard
                    conflict={analysis.conflicts.title}
                    locale={locale}
                    resolution={resolutions.title}
                    onResolve={(r) => setResolution('title', 'title', r)}
                  />
                )}
                {analysis.conflicts.summary && (
                  <TextConflictCard
                    conflict={analysis.conflicts.summary}
                    locale={locale}
                    resolution={resolutions.summary}
                    onResolve={(r) => setResolution('summary', 'summary', r)}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {/* Footer */}
        <CardContent className="border-t py-4">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button 
              onClick={handleApply}
              className="bg-[var(--geisli-primary)] hover:bg-[var(--geisli-primary)]/90"
            >
              {t.apply}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Stats card for overview
 */
function StatCard({ label, count, color }: { label: string; count: number; color: 'amber' | 'green' | 'red' }) {
  const colorClasses = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };
  
  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}

/**
 * Section wrapper
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-[var(--geisli-secondary)]">{title}</h3>
      {children}
    </div>
  );
}
