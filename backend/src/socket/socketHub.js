let ioInstance = null;

export function setSocketIo(io) {
  ioInstance = io;
}

export function emitToProject(projectId, event, payload) {
  if (!ioInstance) return;
  ioInstance.to(`project:${projectId}`).emit(event, payload);
}
