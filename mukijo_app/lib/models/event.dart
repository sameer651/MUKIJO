class Event {
  final int id;
  final int? groupId;
  final int ownerId;
  final String name;
  final String type;
  final String date;
  final String time;
  final String? startTime;
  final String? endTime;
  final String? location;
  final String? description;
  final String? coverImage;
  final String? registrationDeadline;
  final int? maxParticipants;
  final int fee;
  final bool autoReminder;
  final bool attendanceTracking;
  final bool isPublic;
  final bool allowGuest;
  final bool allowWaitingList;
  final String? groupName;

  Event({
    required this.id,
    this.groupId,
    required this.ownerId,
    required this.name,
    required this.type,
    required this.date,
    required this.time,
    this.startTime,
    this.endTime,
    this.location,
    this.description,
    this.coverImage,
    this.registrationDeadline,
    this.maxParticipants,
    required this.fee,
    required this.autoReminder,
    required this.attendanceTracking,
    required this.isPublic,
    required this.allowGuest,
    required this.allowWaitingList,
    this.groupName,
  });

  factory Event.fromJson(Map<String, dynamic> json) {
    return Event(
      id: json['id'] as int,
      groupId: json['group_id'] as int?,
      ownerId: json['owner_id'] as int,
      name: json['name'] as String,
      type: json['type'] as String,
      date: json['date'] as String,
      time: json['time'] as String,
      startTime: json['start_time'] as String?,
      endTime: json['end_time'] as String?,
      location: json['location'] as String?,
      description: json['description'] as String?,
      coverImage: json['cover_image'] as String?,
      registrationDeadline: json['registration_deadline'] as String?,
      maxParticipants: json['max_participants'] as int?,
      fee: json['fee'] as int? ?? 0,
      autoReminder: json['auto_reminder'] as bool? ?? false,
      attendanceTracking: json['attendance_tracking'] as bool? ?? false,
      isPublic: json['is_public'] as bool? ?? true,
      allowGuest: json['allow_guest'] as bool? ?? false,
      allowWaitingList: json['allow_waiting_list'] as bool? ?? false,
      groupName: json['group_name'] as String?,
    );
  }
}
