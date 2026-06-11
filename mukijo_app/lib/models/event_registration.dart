class EventRegistration {
  final int id;
  final int eventId;
  final int? memberId;
  final String participantName;
  final String? participantEmail;
  final String? participantRole;
  final String status; // pending, accepted, declined, maybe, waitlisted
  final String attendance; // present, absent, late, not_marked
  final String? invitedAt;
  final String? respondedAt;

  EventRegistration({
    required this.id,
    required this.eventId,
    this.memberId,
    required this.participantName,
    this.participantEmail,
    this.participantRole,
    required this.status,
    required this.attendance,
    this.invitedAt,
    this.respondedAt,
  });

  factory EventRegistration.fromJson(Map<String, dynamic> json) => EventRegistration(
        id: json['id'] as int,
        eventId: json['event_id'] as int,
        memberId: json['member_id'] as int?,
        participantName: json['participant_name'] as String? ?? '',
        participantEmail: json['participant_email'] as String?,
        participantRole: json['participant_role'] as String?,
        status: json['status'] as String? ?? 'pending',
        attendance: json['attendance'] as String? ?? 'not_marked',
        invitedAt: json['invited_at'] as String?,
        respondedAt: json['responded_at'] as String?,
      );
}
