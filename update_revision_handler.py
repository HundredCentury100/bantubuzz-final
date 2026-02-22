#!/usr/bin/env python3
import re

# Read the file
with open(r'd:\Bantubuzz Platform\frontend\src\pages\CollaborationDetails.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old function pattern (lines 122-156)
old_function = r'''  const handleRequestRevision = async \(\) => \{
    if \(!revisionNotes\.trim\(\)\) \{
      toast\.error\('Please provide revision notes'\);
      return;
    \}

    try \{
      setRequestingRevision\(true\);
      const response = await collaborationsAPI\.requestRevision\(
        id,
        selectedDeliverableForRevision\.id,
        revisionNotes
      \);

      const revisionRequest = response\.data\.revision_request;
      if \(revisionRequest\.is_paid\) \{
        toast\.success\(
          `Revision requested \(Fee: \$\$\{revisionRequest\.fee\}\)\. Creator will be notified\.`,
          \{ duration: 5000 \}
        \);
      \} else \{
        toast\.success\('Revision requested\. Creator will be notified\.'\);
      \}

      setShowRevisionModal\(false\);
      setRevisionNotes\(''\);
      setSelectedDeliverableForRevision\(null\);
      fetchCollaboration\(\);
    \} catch \(error\) \{
      console\.error\('Error requesting revision:', error\);
      toast\.error\('Failed to request revision'\);
    \} finally \{
      setRequestingRevision\(false\);
    \}
  \};'''

# Define the new function
new_function = '''  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      toast.error('Please provide revision notes');
      return;
    }

    // Check if this will be a paid revision
    const willBePaid = totalRevisions >= freeRevisions;

    if (willBePaid && revisionFee > 0) {
      // Store revision request data in localStorage
      localStorage.setItem('pending_revision_request', JSON.stringify({
        collaboration_id: id,
        deliverable_id: selectedDeliverableForRevision.id,
        deliverable_title: selectedDeliverableForRevision.title,
        notes: revisionNotes,
        fee: revisionFee
      }));

      // Close modal and redirect to revision payment page
      setShowRevisionModal(false);
      setRevisionNotes('');
      setSelectedDeliverableForRevision(null);

      toast.info('Redirecting to payment for revision fee...');
      navigate(`/brand/collaborations/${id}/revision-payment`);
      return;
    }

    // Free revision - proceed normally
    try {
      setRequestingRevision(true);
      const response = await collaborationsAPI.requestRevision(
        id,
        selectedDeliverableForRevision.id,
        revisionNotes
      );

      toast.success('Revision requested. Creator will be notified.');
      setShowRevisionModal(false);
      setRevisionNotes('');
      setSelectedDeliverableForRevision(null);
      fetchCollaboration();
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast.error('Failed to request revision');
    } finally {
      setRequestingRevision(false);
    }
  };'''

# Replace the function
content = re.sub(old_function, new_function, content, flags=re.DOTALL)

# Write back
with open(r'd:\Bantubuzz Platform\frontend\src\pages\CollaborationDetails.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ CollaborationDetails.jsx updated successfully!")
