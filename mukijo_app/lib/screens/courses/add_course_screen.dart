import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../core/session.dart';
import '../../providers/courses_provider.dart';
import '../../providers/groups_provider.dart';
import '../../models/group.dart';

class AddCourseScreen extends ConsumerStatefulWidget {
  const AddCourseScreen({super.key});

  @override
  ConsumerState<AddCourseScreen> createState() => _AddCourseScreenState();
}

class _AddCourseScreenState extends ConsumerState<AddCourseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _instructorCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _scheduleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _capacityCtrl = TextEditingController(text: '20');
  final _feeCtrl = TextEditingController(text: '0');

  String _category = 'Training';
  String _level = 'Beginner';
  String _status = 'open';
  String? _startDate;
  String? _endDate;
  int? _selectedGroupId;
  bool _loading = false;

  final List<String> _categories = ['Training', 'Workshop', 'Camp', 'Certificate', 'Other'];
  final List<String> _levels = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
  final List<String> _statuses = ['open', 'draft', 'closed'];

  @override
  void dispose() {
    _titleCtrl.dispose();
    _codeCtrl.dispose();
    _instructorCtrl.dispose();
    _locationCtrl.dispose();
    _scheduleCtrl.dispose();
    _descCtrl.dispose();
    _capacityCtrl.dispose();
    _feeCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isStart) async {
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 1000)),
      builder: (ctx, child) => Theme(data: ThemeData.dark().copyWith(colorScheme: const ColorScheme.dark(primary: AppTheme.primary)), child: child!),
    );
    if (d != null) {
      setState(() {
        if (isStart) _startDate = d.toIso8601String().split('T')[0];
        else _endDate = d.toIso8601String().split('T')[0];
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final ownerId = await Session.getOwnerId();
      await ref.read(coursesNotifierProvider.notifier).createCourse({
        'owner_id': ownerId,
        'group_id': _selectedGroupId,
        'title': _titleCtrl.text.trim(),
        'code': _codeCtrl.text.trim().isEmpty ? null : _codeCtrl.text.trim(),
        'category': _category,
        'level': _level,
        'instructor': _instructorCtrl.text.trim().isEmpty ? null : _instructorCtrl.text.trim(),
        'location': _locationCtrl.text.trim().isEmpty ? null : _locationCtrl.text.trim(),
        'schedule': _scheduleCtrl.text.trim().isEmpty ? null : _scheduleCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'start_date': _startDate,
        'end_date': _endDate,
        'capacity': int.tryParse(_capacityCtrl.text) ?? 20,
        'fee': int.tryParse(_feeCtrl.text) ?? 0,
        'status': _status,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Course created!'), backgroundColor: AppTheme.success));
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

    return Scaffold(
      appBar: AppBar(title: const Text('Create Course')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Label('Course Title *'),
              TextFormField(controller: _titleCtrl, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'e.g. Advanced Football Training'), validator: (v) => v == null || v.isEmpty ? 'Title required' : null),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _Label('Course Code'),
                  TextFormField(controller: _codeCtrl, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'e.g. FTB-101')),
                ])),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _Label('Category'),
                  DropdownButtonFormField<String>(value: _category, dropdownColor: AppTheme.bgLight, style: const TextStyle(color: AppTheme.textPrimary), items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(), onChanged: (v) => setState(() => _category = v!), decoration: const InputDecoration()),
                ])),
              ]),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _Label('Level'),
                  DropdownButtonFormField<String>(value: _level, dropdownColor: AppTheme.bgLight, style: const TextStyle(color: AppTheme.textPrimary), items: _levels.map((l) => DropdownMenuItem(value: l, child: Text(l))).toList(), onChanged: (v) => setState(() => _level = v!), decoration: const InputDecoration()),
                ])),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _Label('Status'),
                  DropdownButtonFormField<String>(value: _status, dropdownColor: AppTheme.bgLight, style: const TextStyle(color: AppTheme.textPrimary), items: _statuses.map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase()))).toList(), onChanged: (v) => setState(() => _status = v!), decoration: const InputDecoration()),
                ])),
              ]),
              const SizedBox(height: 16),
              _Label('Instructor'),
              TextFormField(controller: _instructorCtrl, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'Instructor name')),
              const SizedBox(height: 16),
              _Label('Group (optional)'),
              DropdownButtonFormField<int>(value: _selectedGroupId, dropdownColor: AppTheme.bgLight, style: const TextStyle(color: AppTheme.textPrimary), hint: const Text('No group filter', style: TextStyle(color: AppTheme.textMuted)), items: groups.map((g) => DropdownMenuItem(value: g.id, child: Text(g.groupName))).toList(), onChanged: (v) => setState(() => _selectedGroupId = v), decoration: const InputDecoration()),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _Label('Capacity'),
                  TextFormField(controller: _capacityCtrl, keyboardType: TextInputType.number, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: '20')),
                ])),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  _Label('Fee (₹)'),
                  TextFormField(controller: _feeCtrl, keyboardType: TextInputType.number, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: '0')),
                ])),
              ]),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: _DatePicker(label: 'Start Date', value: _startDate, onTap: () => _pickDate(true))),
                const SizedBox(width: 12),
                Expanded(child: _DatePicker(label: 'End Date', value: _endDate, onTap: () => _pickDate(false))),
              ]),
              const SizedBox(height: 16),
              _Label('Schedule'),
              TextFormField(controller: _scheduleCtrl, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'e.g. Mon, Wed, Fri 6-8 PM')),
              const SizedBox(height: 16),
              _Label('Location'),
              TextFormField(controller: _locationCtrl, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'Training ground, gym...')),
              const SizedBox(height: 16),
              _Label('Description'),
              TextFormField(controller: _descCtrl, maxLines: 3, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'Course details...')),
              const SizedBox(height: 32),
              SizedBox(width: double.infinity, child: ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Create Course'))),
            ],
          ),
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

class _DatePicker extends StatelessWidget {
  final String label;
  final String? value;
  final VoidCallback onTap;
  const _DatePicker({required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500))),
    GestureDetector(onTap: onTap, child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14), decoration: BoxDecoration(color: AppTheme.bgLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)), child: Row(children: [const Icon(Icons.calendar_today, color: AppTheme.textMuted, size: 14), const SizedBox(width: 8), Text(value ?? 'Pick date', style: TextStyle(color: value != null ? AppTheme.textPrimary : AppTheme.textMuted, fontSize: 13))]))),
  ]);
}
