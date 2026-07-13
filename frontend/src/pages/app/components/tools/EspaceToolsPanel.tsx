// frontend/src/pages/app/components/tools/EspaceToolsPanel.tsx
import { useRef, useCallback } from 'react';
import { useToolData } from './hooks/useToolData';
import { ToolTabs } from './shared/ToolTabs';
import { MemberFilter } from './shared/MemberFilter';
import { FileSection } from './shared/FileSection';
import { ReportSection } from './shared/ReportSection';
import { AbsenceSection } from './shared/AbsenceSection';
import type { Task } from '../../../../types';

interface EspaceToolsPanelProps {
  workspaceId?: string | null;
  espaceId: string;
  currentUserId?: string | null;
  effectiveRole: string | null;
  tasks: Task[];
  initialTool?: 'files' | 'reports' | 'absences';
}

export default function EspaceToolsPanel({
  workspaceId,
  espaceId,
  currentUserId,
  effectiveRole,
  tasks,
  initialTool = 'files',
}: EspaceToolsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toolData = useToolData({
    resourceType: 'espace',
    workspaceId,
    espaceId,
    currentUserId,
    effectiveRole,
    tasks,
    initialTool,
  });

  // ✅ Wrappers pour adapter la signature
  const handleApprove = useCallback((absence: any) => {
    toolData.openAbsenceDecision(absence, 'approve');
  }, [toolData.openAbsenceDecision]);

  const handleReject = useCallback((absence: any) => {
    toolData.openAbsenceDecision(absence, 'reject');
  }, [toolData.openAbsenceDecision]);

  return (
    <div className="space-y-8 pb-20">
      <ToolTabs
        activeTool={toolData.activeTool}
        setActiveTool={toolData.setActiveTool}
        canViewFiles={toolData.canViewFiles}
        canViewReports={toolData.canViewReports}
        canViewAbsences={toolData.canViewAbsences}
      />

      {(toolData.activeTool === 'files' || toolData.activeTool === 'reports') && (
        <MemberFilter
          directMembers={toolData.directMembers}
          inheritedMembers={toolData.inheritedMembers}
          selectedMemberId={toolData.selectedMemberId}
          setSelectedMemberId={toolData.setSelectedMemberId}
          directLabel="Membres de l'espace"
          inheritedLabel="Membres du workspace parent"
          currentUserId={currentUserId}
        />
      )}

      {toolData.activeTool === 'files' && (
        <FileSection
          files={toolData.filesWithAuthors}
          loading={toolData.loading}
          canAddFiles={toolData.canAddFiles}
          onUpload={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            toolData.setIsUploading(true);
            toolData.handleUploadFile(file);
          }}
          onCreate={toolData.handleCreateFile}
          onDelete={toolData.handleDeleteFile}
          onDownload={toolData.handleDownload}
          fileForm={toolData.fileForm}
          setFileForm={toolData.setFileForm}
          isUploading={toolData.isUploading}
          currentUserId={currentUserId}
          isCreator={toolData.isDirectResourceCreator}
          fileInputRef={fileInputRef}
        />
      )}

      {toolData.activeTool === 'reports' && (
        <ReportSection
          reports={toolData.reports}
          ownReports={toolData.ownReports}
          accessibleReports={toolData.accessibleReports}
          archivedReports={toolData.archivedReports}
          loading={toolData.loading}
          canCreateReport={toolData.canCreateReport}
          canReceiveReports={toolData.canReceiveReports}
          canShowOwnHistory={toolData.canShowOwnReportHistory}
          useFullWidth={toolData.useFullReportWidth}
          isListScope={false}
          reportContactMembers={[]}
          listMemberNeedsAssignedTask={false}
          directAdminNeedsChild={toolData.directAdminNeedsChildForReport}
          reportForm={toolData.reportForm}
          setReportForm={toolData.setReportForm}
          reportEditForm={toolData.reportEditForm}
          setReportEditForm={toolData.setReportEditForm}
          onCreate={toolData.handleCreateReport}
          onEdit={toolData.startEditReport}
          onDelete={toolData.handleDeleteReport}
          onArchive={toolData.archiveReport}
          onUnarchive={toolData.unarchiveReport}
          onPrint={toolData.printReport}
          onUpdate={toolData.handleUpdateReport}
          selectedReport={toolData.selectedReport}
          setSelectedReport={toolData.setSelectedReport}
          editingReport={toolData.editingReport}
          setEditingReport={toolData.setEditingReport}
          isReportArchiveOpen={toolData.isReportArchiveOpen}
          setIsReportArchiveOpen={toolData.setIsReportArchiveOpen}
          onViewReport={(report) => toolData.setSelectedReport(report)}
          spaceOrWorkspaceLabel="espace"
        />
      )}

      {toolData.activeTool === 'absences' && (
        <AbsenceSection
          absences={toolData.absences}
          ownAbsences={toolData.ownAbsences}
          accessibleAbsences={toolData.accessibleAbsences}
          pendingAbsences={toolData.pendingAbsences}
          visibleAbsences={toolData.visibleAbsences}
          calendarAbsences={toolData.calendarAbsences}
          archivedAbsences={toolData.archivedAbsences}
          loading={toolData.loading}
          canCreateAbsence={toolData.canCreateAbsence}
          canViewOwnAbsenceRequests={toolData.canViewOwnAbsenceRequests}
          isManager={toolData.isManager}
          isDirectResourceCreator={toolData.isDirectResourceCreator}
          isDirectResourceAdmin={toolData.isDirectResourceAdmin}
          currentUserId={currentUserId}
          absenceView={toolData.absenceView}
          setAbsenceView={toolData.setAbsenceView}
          absenceForm={toolData.absenceForm}
          setAbsenceForm={toolData.setAbsenceForm}
          isAbsentModalOpen={toolData.isAbsentModalOpen}
          setIsAbsentModalOpen={toolData.setIsAbsentModalOpen}
          isAbsenceArchiveOpen={toolData.isAbsenceArchiveOpen}
          setIsAbsenceArchiveOpen={toolData.setIsAbsenceArchiveOpen}
          absenceDashboard={toolData.absenceDashboard}
          decisionTarget={toolData.decisionTarget}
          decisionAction={toolData.decisionAction}
          decisionComment={toolData.decisionComment}
          setDecisionComment={toolData.setDecisionComment}
          selectedAbsenceForImpact={toolData.selectedAbsenceForImpact}
          setSelectedAbsenceForImpact={toolData.setSelectedAbsenceForImpact}
          absenceImpacts={toolData.absenceImpacts}
          listAvailability={toolData.listAvailability}
          availabilityLoading={toolData.availabilityLoading}
          taskReplacementByTaskId={toolData.taskReplacementByTaskId}
          setTaskReplacementByTaskId={toolData.setTaskReplacementByTaskId}
          adminCandidateUserId={toolData.adminCandidateUserId}
          setAdminCandidateUserId={toolData.setAdminCandidateUserId}
          adminInviteIdentifier={toolData.adminInviteIdentifier}
          setAdminInviteIdentifier={toolData.setAdminInviteIdentifier}
          eligibleInheritedMembers={toolData.eligibleInheritedMembers}
          resourceType="espace"
          directMembers={toolData.directMembers}
          isDirectMemberRecord={toolData.isDirectMemberRecord}
          showNoReplacementNotification={toolData.showNoReplacementNotification}
          setShowNoReplacementNotification={toolData.setShowNoReplacementNotification}
          noReplacementTaskId={toolData.noReplacementTaskId}
          setNoReplacementTaskId={toolData.setNoReplacementTaskId}
          onCreate={toolData.handleCreateAbsence}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={toolData.handleCancelAbsence}
          onArchive={toolData.archiveAbsence}
          onUnarchive={toolData.unarchiveAbsence}
          onDecision={toolData.handleAbsenceDecision}
          onCloseDecision={toolData.closeAbsenceDecision}
          onAssignReplacement={toolData.handleAssignTaskReplacement}
          onAddBackupAdmin={toolData.handleAddBackupAdmin}
          onViewImpact={toolData.checkImpact}
          getTasksImpactedByAbsence={toolData.getTasksImpactedByAbsence}
          getSortedReplacementCandidates={toolData.getSortedReplacementCandidates}
          formatDate={toolData.formatDate}
          getDurationDisplay={toolData.getDurationDisplay}
        />
      )}
    </div>
  );
}