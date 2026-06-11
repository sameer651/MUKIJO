class FundraisingCampaign {
  final int id;
  final int ownerId;
  final String title;
  final String? description;
  final int goal;
  final int raised;
  final String status; // active, paused, completed
  final String? deadline;
  final String? groupName;
  final int donorsCount;

  FundraisingCampaign({
    required this.id,
    required this.ownerId,
    required this.title,
    this.description,
    required this.goal,
    required this.raised,
    required this.status,
    this.deadline,
    this.groupName,
    required this.donorsCount,
  });

  double get progressPercent => goal > 0 ? (raised / goal).clamp(0.0, 1.0) : 0;
  int get remaining => (goal - raised).clamp(0, goal);

  factory FundraisingCampaign.fromJson(Map<String, dynamic> json) => FundraisingCampaign(
        id: json['id'] as int,
        ownerId: json['owner_id'] as int,
        title: json['title'] as String,
        description: json['description'] as String?,
        goal: json['goal'] as int? ?? 0,
        raised: json['raised'] as int? ?? 0,
        status: json['status'] as String? ?? 'active',
        deadline: json['deadline'] as String?,
        groupName: json['group_name'] as String?,
        donorsCount: json['donors_count'] as int? ?? 0,
      );
}
