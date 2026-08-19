# Admin Dashboard — Real-world operations update

The Admin sidebar remains the navigation menu. The Dashboard no longer repeats the same menu functions as shortcut cards.

## New Dashboard functions

1. Operations Alert Center
   - Pending applications
   - Pending claims
   - Pending payments
   - Unread customer feedback
   - Automatically sorts the largest queue first.

2. Service Progress
   - Shows completed-vs-waiting review progress for applications and claims.
   - This is an operational progress indicator, not an approval-rate score.

3. Quick Announcement
   - Admin can send a notice directly from Dashboard to Customers, Agents, or both.
   - Supports Information, Reminder, and Payment notice types.

4. Daily Control Checklist
   - Shows whether application, claim, payment, and feedback queues are currently cleared.

5. Operations summary
   - Total work waiting now
   - Monthly verified revenue
   - Customer/agent service network
   - Available insurance plans

## Performance changes

- Dashboard no longer calls the Python revenue prediction service during initial load.
- User totals use database COUNT queries instead of loading full user lists.
- Pending payment and unread feedback counts are database-side counts.
- Recent activity now requests only the latest 10 notifications instead of loading every notification and sorting in Java.

The dedicated Predictions page remains available from the Admin sidebar for forecasting and evaluation.
