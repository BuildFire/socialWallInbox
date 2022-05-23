class Thread {
  constructor(record = {}) {
    if (!record.data) record.data = {};
    this.id = record.id || undefined;
    this.isActive =
      typeof record.data.isActive === "boolean" ? record.data.isActive : true;
    this.createdOn = record.data.createdOn || new Date();
    this.createdBy = record.data.createdBy || undefined;
    this.lastUpdatedOn = record.data.lastUpdatedOn || undefined;
    this.lastUpdatedBy = record.data.lastUpdatedBy || undefined;
    this.deletedOn = record.data.deletedOn || undefined;
    this.deletedBy = record.data.deletedBy || undefined;

    this.users = record.data.users || [];
    this.wallId = record.data.wallId || undefined;
    this.wallTitle = record.data.wallTitle || undefined;
    this.navigationData = record.data.navigationData || {
      pluginId: undefined,
      instanceId: undefined,
      folderName: undefined
    };
    this.isSupportThread = record.data.isSupportThread || undefined;
    this.lastMessage = record.data.lastMessage || {
      text: undefined,
      createdAt: undefined,
      sender: undefined,
      isRead: undefined
    };
  }

  /**
   * Get instance ready for data access with _buildfire index object
   */
  toJSON() {
    return {
      id: this.id,
      isActive: this.isActive,
      createdOn: this.createdOn,
      createdBy: this.createdBy,
      lastUpdatedOn: this.lastUpdatedOn,
      lastUpdatedBy: this.lastUpdatedBy,
      deletedOn: this.deletedOn,
      deletedBy: this.deletedBy,

      users: this.users,
      wallId: this.wallId,
      wallTitle: this.wallTitle,
      lastMessage: this.lastMessage,
      navigationData: this.navigationData,
      isSupportThread: this.isSupportThread,
      _buildfire: {
        index: {
          number1: this.isActive ? 1 : 0,
          date1: this.lastMessage.createdAt,
          string1: this.wallId,
          array1: this.users.map(user => ({
            string1: user._id
          })),
          text: this.users.map(user => user.displayName).join(" || ")
        }
      }
    };
  }
}

export default Thread;
