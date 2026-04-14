import mongoose from 'mongoose';

export const TASK_STATUSES = ['Pending', 'Running', 'Completed', 'Failed', 'Blocked'];

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority: { type: Number, required: true, min: 1, max: 5 },
    estimatedHours: { type: Number, required: true, min: 0 },
    status: { type: String, enum: TASK_STATUSES, default: 'Pending' },
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    resourceTag: { type: String, required: true, trim: true, default: 'default' },
    maxRetries: { type: Number, required: true, min: 0, default: 0 },
    retryCount: { type: Number, required: true, min: 0, default: 0 },
    versionNumber: { type: Number, required: true, min: 1, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taskSchema.index({ projectId: 1, createdAt: 1 });

taskSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    projectId: this.projectId.toString(),
    title: this.title,
    description: this.description,
    priority: this.priority,
    estimatedHours: this.estimatedHours,
    status: this.status,
    dependencies: this.dependencies.map((d) => d.toString()),
    resourceTag: this.resourceTag,
    maxRetries: this.maxRetries,
    retryCount: this.retryCount,
    versionNumber: this.versionNumber,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Task = mongoose.model('Task', taskSchema);
