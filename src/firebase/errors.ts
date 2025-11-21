export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  details: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `Firestore Permission Denied: ${context.operation.toUpperCase()} on ${context.path}`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.details = context;
    // This is to make the error object serializable for the toast
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
