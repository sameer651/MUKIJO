import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../core/session.dart';
import '../../providers/payments_provider.dart';
import '../../providers/groups_provider.dart';
import '../../models/group.dart';
import '../../models/member.dart';

class AddPaymentScreen extends ConsumerStatefulWidget {
  const AddPaymentScreen({super.key});

  @override
  ConsumerState<AddPaymentScreen> createState() => _AddPaymentScreenState();
}

class _AddPaymentScreenState extends ConsumerState<AddPaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  String _category = 'Membership Fee';
  String? _dueDate;
  int? _selectedGroupId;
  int? _selectedMemberId;
  bool _loading = false;

  final List<String> _categories = ['Membership Fee', 'Tournament Fee', 'Training Fee', 'Equipment Fee', 'Event Fee', 'Donation', 'Other'];

  @override
  void dispose() {
    _titleCtrl.dispose();
    _amountCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      builder: (ctx, child) => Theme(data: ThemeData.dark().copyWith(colorScheme: const ColorScheme.dark(primary: AppTheme.primary)), child: child!),
    );
    if (d != null) setState(() => _dueDate = d.toIso8601String().split('T')[0]);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final ownerId = await Session.getOwnerId();
      await ref.read(paymentsNotifierProvider.notifier).createPayment({
        'owner_id': ownerId,
        'group_id': _selectedGroupId,
        'member_id': _selectedMemberId,
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'category': _category,
        'amount': int.parse(_amountCtrl.text.trim()),
        'due_date': _dueDate,
        'status': 'pending',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment request created!'), backgroundColor: AppTheme.success));
        context.pop();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final groupsAsync = ref.watch(groupsProvider);
    final groups = groupsAsync.maybeWhen(data: (g) => g, orElse: () => <Group>[]);

    final membersAsync = _selectedGroupId != null ? ref.watch(groupMembersProvider(_selectedGroupId!)) : null;
    final members = membersAsync?.maybeWhen(data: (m) => m, orElse: () => <Member>[]) ?? <Member>[];

    return Scaffold(
      appBar: AppBar(title: const Text('Add Payment Request')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _Label('Title *'),
            TextFormField(controller: _titleCtrl, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'e.g. Monthly Membership Fee'), validator: (v) => v == null || v.isEmpty ? 'Title required' : null),
            const SizedBox(height: 16),
            _Label('Amount (₹) *'),
            TextFormField(controller: _amountCtrl, keyboardType: TextInputType.number, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'Enter amount'), validator: (v) {
              if (v == null || v.isEmpty) return 'Amount required';
              final n = int.tryParse(v);
              if (n == null || n <= 0) return 'Enter a valid amount';
              return null;
            }),
            const SizedBox(height: 16),
            _Label('Category'),
            DropdownButtonFormField<String>(value: _category, dropdownColor: AppTheme.bgLight, style: const TextStyle(color: AppTheme.textPrimary), items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(), onChanged: (v) => setState(() => _category = v!), decoration: const InputDecoration()),
            const SizedBox(height: 16),
            _Label('Assign to Group (optional)'),
            DropdownButtonFormField<int>(
              value: _selectedGroupId,
              dropdownColor: AppTheme.bgLight,
              style: const TextStyle(color: AppTheme.textPrimary),
              hint: const Text('Club-wide', style: TextStyle(color: AppTheme.textMuted)),
              items: groups.map((g) => DropdownMenuItem(value: g.id, child: Text(g.groupName))).toList(),
              onChanged: (v) => setState(() { _selectedGroupId = v; _selectedMemberId = null; }),
              decoration: const InputDecoration(),
            ),
            if (_selectedGroupId != null && members.isNotEmpty) ...[
              const SizedBox(height: 16),
              _Label('Assign to Specific Member (optional)'),
              DropdownButtonFormField<int>(
                value: _selectedMemberId,
                dropdownColor: AppTheme.bgLight,
                style: const TextStyle(color: AppTheme.textPrimary),
                hint: const Text('All group members', style: TextStyle(color: AppTheme.textMuted)),
                items: members.map((m) => DropdownMenuItem(value: m.id, child: Text(m.fullName))).toList(),
                onChanged: (v) => setState(() => _selectedMemberId = v),
                decoration: const InputDecoration(),
              ),
            ],
            const SizedBox(height: 16),
            _Label('Due Date (optional)'),
            GestureDetector(
              onTap: _pickDueDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(color: AppTheme.bgLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)),
                child: Row(children: [
                  const Icon(Icons.calendar_today, color: AppTheme.textMuted, size: 16),
                  const SizedBox(width: 8),
                  Text(_dueDate ?? 'No due date', style: TextStyle(color: _dueDate != null ? AppTheme.textPrimary : AppTheme.textMuted, fontSize: 14)),
                  const Spacer(),
                  if (_dueDate != null) GestureDetector(onTap: () => setState(() => _dueDate = null), child: const Icon(Icons.clear, color: AppTheme.textMuted, size: 16)),
                ]),
              ),
            ),
            const SizedBox(height: 16),
            _Label('Notes (optional)'),
            TextFormField(controller: _descCtrl, maxLines: 2, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'Additional notes...')),
            const SizedBox(height: 32),
            SizedBox(width: double.infinity, child: ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Create Payment Request'))),
          ]),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(text, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)));
}
