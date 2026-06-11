class Group {
  final int id;
  final String activity;
  final String ageGroup;
  final String groupName;
  final String? subGroup;
  final String? description;
  final int ownerId;

  Group({
    required this.id,
    required this.activity,
    required this.ageGroup,
    required this.groupName,
    this.subGroup,
    this.description,
    required this.ownerId,
  });

  factory Group.fromJson(Map<String, dynamic> json) {
    return Group(
      id: json['id'] as int,
      activity: json['activity'] as String,
      ageGroup: json['age_group'] as String,
      groupName: json['group_name'] as String,
      subGroup: json['sub_group'] as String?,
      description: json['description'] as String?,
      ownerId: json['owner_id'] as int,
    );
  }
}
