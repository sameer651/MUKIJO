class AppUser {
  final int id;
  final String clubName;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String? country;
  final String? state;
  final String? sport;

  AppUser({
    required this.id,
    required this.clubName,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.phone,
    this.country,
    this.state,
    this.sport,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as int,
        clubName: json['club_name'] as String? ?? '',
        firstName: json['first_name'] as String? ?? '',
        lastName: json['last_name'] as String? ?? '',
        email: json['email'] as String? ?? '',
        phone: json['phone'] as String?,
        country: json['country'] as String?,
        state: json['state'] as String?,
        sport: json['sport'] as String?,
      );
}
