// Main view
export { CVView } from './CVView';
export type { CVViewProps } from './CVView';

// Store / context
export { CVProvider, useCVState, useCVActions, useCVImportExport } from './store/cv-store';
export { OntologyProvider, useCustomOntology } from './store/ontology-store';
export type { CVState, CVAction } from './store/cv-types';

// Brand config context
export { BrandConfigProvider, useBrandConfig } from './contexts/brand-config-context';

// Print
export { PaginatedPrintLayout } from './print/print-layout-paginated';
export { CoverPage } from './print/cover-page';
export { PrintMeasurementRoot } from './components/PrintMeasurementRoot';
export { BlockRenderer } from './components/BlockRenderer';

// Hooks
export { useCvPagination } from './hooks/useCvPagination';
export type { UseCvPaginationOptions, UseCvPaginationResult } from './hooks/useCvPagination';

// lib
export { getPrintThemeConfig, getPageConfigForTheme, attachHeaderFooterToSections } from './lib/print-theme-config';
export { DomMeasurementService } from './lib/measurement-service-dom';

// Utils
export { cn } from './utils';

// shadcn/ui primitives
export { Button } from './components/ui/button';
export { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './components/ui/card';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
export { Input } from './components/ui/input';
export { Label } from './components/ui/label';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
export { Separator } from './components/ui/separator';
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion';
export { Textarea } from './components/ui/textarea';

// Components
export { BasicMarkdownText } from './components/BasicMarkdownText';
export { SkillBadge } from './components/SkillBadge';
export { ImportDialog } from './components/import';

// Editors (re-exported for consumers that want individual panels)
export { SkillsEditor } from './editors/skill-editor';
export { RolesEditor } from './editors/role-editor';
export { HobbyProjectsEditor } from './editors/hobby-project-editor';
export { TrainingsEditor } from './editors/training-editor';
export { EducationEditor } from './editors/education-editor';
export { CommitmentsEditor } from './editors/commitment-editor';
export { RenderSpecEditor } from './editors/render-spec-editor';
export { OntologyEditor } from './editors/ontology-editor';
