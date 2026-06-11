class Payment {
  final int id;
  final int ownerId;
  final int? groupId;
  final int? memberId;
  final String title;
  final String? description;
  final String category;
  final int amount;
  final String? dueDate;
  final String status;
  final String? paymentMethod;
  final String? paidAt;
  final String? createdAt;
  final String? groupName;
  final String? memberName;

  Payment({
    required this.id,
    required this.ownerId,
    this.groupId,
    this.memberId,
    required this.title,
    this.description,
    required this.category,
    required this.amount,
    this.dueDate,
    required this.status,
    this.paymentMethod,
    this.paidAt,
    this.createdAt,
    this.groupName,
    this.memberName,
  });

  factory Payment.fromJson(Map<String, dynamic> json) {
    return Payment(
      id: json['id'] as int,
      ownerId: json['owner_id'] as int,
      groupId: json['group_id'] as int?,
      memberId: json['member_id'] as int?,
      title: json['title'] as String,
      description: json['description'] as String?,
      category: json['category'] as String? ?? 'Fee',
      amount: json['amount'] as int? ?? 0,
      dueDate: json['due_date'] as String?,
      status: json['status'] as String? ?? 'pending',
      paymentMethod: json['payment_method'] as String?,
      paidAt: json['paid_at'] as String?,
      createdAt: json['created_at'] as String?,
      groupName: json['group_name'] as String?,
      memberName: json['member_name'] as String?,
    );
  }
}
