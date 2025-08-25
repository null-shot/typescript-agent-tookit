import {
  WorkflowEntrypoint,
  WorkflowStep,
  WorkflowEvent,
} from "cloudflare:workers";

export interface Env {}

export type ExpenseParams = {
  expenseId: string;
  user: string;
  amount: number;
  description: string;
};

export class ExpenseApprovalWorkflow extends WorkflowEntrypoint<
  Env,
  ExpenseParams
> {
  async run(event: WorkflowEvent<ExpenseParams>, step: WorkflowStep) {
    // Mark as submitted
    await step.do("Mark as submitted", async () => {
      // In a real app, update status in D1/KV here
      console.log(
        `Expense ${event.payload.expenseId} submitted by ${event.payload.user}`
      );
    });

    // Wait for approval/rejection event with timeout
    try {
      const action = await step.waitForEvent('approval_action', {
        timeout: '24 hours'
      });
      
      if (action.payload === 'approve') {
        await step.do('Mark as approved', async () => {
          console.log(`Expense ${event.payload.expenseId} approved`);
        });
      } else {
        await step.do('Mark as rejected', async () => {
          console.log(`Expense ${event.payload.expenseId} rejected`);
        });
      }
    } catch (error) {
      // Handle timeout or other errors gracefully
      await step.do('Mark as pending approval', async () => {
        console.log(`Expense ${event.payload.expenseId} is pending approval (workflow active)`);
      });
    }
  }
}
