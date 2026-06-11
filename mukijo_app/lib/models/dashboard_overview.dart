class DashboardOverview {
  final int totalMembers;
  final int totalGroups;
  final int totalCourses;
  final int pendingPayments;
  final int upcomingEventsCount;
  final int fundraisingTotal;
  final List<RecentMember> recentRegistrations;
  final List<UpcomingEvent> upcomingEvents;
  final List<GroupSummary> groups;

  DashboardOverview({
    required this.totalMembers,
    required this.totalGroups,
    required this.totalCourses,
    required this.pendingPayments,
    required this.upcomingEventsCount,
    required this.fundraisingTotal,
    required this.recentRegistrations,
    required this.upcomingEvents,
    required this.groups,
  });

  factory DashboardOverview.fromJson(Map<String, dynamic> json) => DashboardOverview(
        totalMembers: json['total_members'] as int? ?? 0,
        totalGroups: json['total_groups'] as int? ?? 0,
        totalCourses: json['total_courses'] as int? ?? 0,
        pendingPayments: json['pending_payments'] as int? ?? 0,
        upcomingEventsCount: json['upcoming_events_count'] as int? ?? 0,
        fundraisingTotal: json['fundraising_total'] as int? ?? 0,
        recentRegistrations: (json['recent_registrations'] as List? ?? [])
            .map((e) => RecentMember.fromJson(e))
            .toList(),
        upcomingEvents: (json['upcoming_events'] as List? ?? [])
            .map((e) => UpcomingEvent.fromJson(e))
            .toList(),
        groups: (json['groups'] as List? ?? [])
            .map((e) => GroupSummary.fromJson(e))
            .toList(),
      );
}

class RecentMember {
  final int id;
  final String firstName;
  final String lastName;
  final String email;
  final String? groupName;

  RecentMember({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.groupName,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory RecentMember.fromJson(Map<String, dynamic> json) => RecentMember(
        id: json['id'] as int,
        firstName: json['first_name'] as String? ?? '',
        lastName: json['last_name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        groupName: json['group_name'] as String?,
      );
}

class UpcomingEvent {
  final int id;
  final String name;
  final String type;
  final String? date;
  final String? time;
  final String? location;

  UpcomingEvent({
    required this.id,
    required this.name,
    required this.type,
    this.date,
    this.time,
    this.location,
  });

  factory UpcomingEvent.fromJson(Map<String, dynamic> json) => UpcomingEvent(
        id: json['id'] as int,
        name: json['name'] as String? ?? '',
        type: json['type'] as String? ?? '',
        date: json['date'] as String?,
        time: json['time'] as String?,
        location: json['location'] as String?,
      );
}

class GroupSummary {
  final int id;
  final String groupName;
  final String activity;

  GroupSummary({
    required this.id,
    required this.groupName,
    required this.activity,
  });

  factory GroupSummary.fromJson(Map<String, dynamic> json) => GroupSummary(
        id: json['id'] as int,
        groupName: json['group_name'] as String? ?? '',
        activity: json['activity'] as String? ?? '',
      );
}
