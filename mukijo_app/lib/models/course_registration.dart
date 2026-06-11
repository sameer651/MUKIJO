class CourseRegistration {
  final int id;
  final int ownerId;
  final int courseId;
  final int? memberId;
  final String participantName;
  final String? participantEmail;
  final String? participantPhone;
  final String status; // registered, waitlisted, cancelled, completed
  final String paymentStatus; // unpaid, paid, waived
  final String? notes;
  final String? registeredAt;
  final String? courseTitle;
  final String? groupName;

  CourseRegistration({
    required this.id,
    required this.ownerId,
    required this.courseId,
    this.memberId,
    required this.participantName,
    this.participantEmail,
    this.participantPhone,
    required this.status,
    required this.paymentStatus,
    this.notes,
    this.registeredAt,
    this.courseTitle,
    this.groupName,
  });

  factory CourseRegistration.fromJson(Map<String, dynamic> json) => CourseRegistration(
        id: json['id'] as int,
        ownerId: json['owner_id'] as int,
        courseId: json['course_id'] as int,
        memberId: json['member_id'] as int?,
        participantName: json['participant_name'] as String? ?? '',
        participantEmail: json['participant_email'] as String?,
        participantPhone: json['participant_phone'] as String?,
        status: json['status'] as String? ?? 'registered',
        paymentStatus: json['payment_status'] as String? ?? 'unpaid',
        notes: json['notes'] as String?,
        registeredAt: json['registered_at'] as String?,
        courseTitle: json['course_title'] as String?,
        groupName: json['group_name'] as String?,
      );
}
