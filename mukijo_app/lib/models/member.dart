class Member {
  final int id;
  final int groupId;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final String role;
  final String? groupName;

  Member({
    required this.id,
    required this.groupId,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
    required this.role,
    this.groupName,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory Member.fromJson(Map<String, dynamic> json) => Member(
        id: json['id'] as int,
        groupId: json['group_id'] as int,
        firstName: json['first_name'] as String? ?? '',
        lastName: json['last_name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        role: json['role'] as String? ?? 'Member',
        groupName: json['group_name'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'first_name': firstName,
        'last_name': lastName,
        'email': email,
        'phone': phone,
        'role': role,
      };
}
