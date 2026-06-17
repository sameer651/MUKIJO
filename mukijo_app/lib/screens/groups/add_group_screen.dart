import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../core/session.dart';
import '../../providers/groups_provider.dart';

class AddGroupScreen extends ConsumerStatefulWidget {
  const AddGroupScreen({super.key});

  @override
  ConsumerState<AddGroupScreen> createState() => _AddGroupScreenState();
}

class _AddGroupScreenState extends ConsumerState<AddGroupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _subGroupCtrl = TextEditingController();
  String _activity = 'Football';
  String _ageGroup = 'U-18';
  bool _loading = false;

  final List<String> _activities = [
    'Football', 'Cricket', 'Basketball', 'Volleyball', 'Tennis',
    'Swimming', 'Athletics', 'Badminton', 'Hockey', 'Other'
  ];

  final List<String> _ageGroups = [
    'U-8', 'U-10', 'U-12', 'U-14', 'U-16', 'U-18', 'U-21', 'Senior', 'All Ages'
  ];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    _subGroupCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final ownerId = await Session.getOwnerId();
      await ref.read(groupsNotifierProvider.notifier).createGroup({
        'group_name': _nameCtrl.text.trim(),
        'activity': _activity,
        'age_group': _ageGroup,
        'sub_group': _subGroupCtrl.text.trim().isEmpty ? null : _subGroupCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'owner_id': ownerId,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Group created!'), backgroundColor: AppTheme.success),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Group')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Label('Group Name'),
              TextFormField(
                controller: _nameCtrl,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(hintText: 'e.g. Under-16 Football Team'),
                validator: (v) => v == null || v.isEmpty ? 'Name is required' : null,
              ),
              const SizedBox(height: 16),
              _Label('Activity / Sport'),
              DropdownButtonFormField<String>(
                value: _activity,
                dropdownColor: AppTheme.bgLight,
                style: const TextStyle(color: AppTheme.textPrimary),
                items: _activities.map((a) => DropdownMenuItem(value: a, child: Text(a))).toList(),
                onChanged: (v) => setState(() => _activity = v!),
                decoration: const InputDecoration(),
              ),
              const SizedBox(height: 16),
              _Label('Age Group'),
              DropdownButtonFormField<String>(
                value: _ageGroup,
                dropdownColor: AppTheme.bgLight,
                style: const TextStyle(color: AppTheme.textPrimary),
                items: _ageGroups.map((a) => DropdownMenuItem(value: a, child: Text(a))).toList(),
                onChanged: (v) => setState(() => _ageGroup = v!),
                decoration: const InputDecoration(),
              ),
              const SizedBox(height: 16),
              _Label('Sub-Group (optional)'),
              TextFormField(
                controller: _subGroupCtrl,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(hintText: 'e.g. Squad A, Division 1'),
              ),
              const SizedBox(height: 16),
              _Label('Description (optional)'),
              TextFormField(
                controller: _descCtrl,
                style: const TextStyle(color: AppTheme.textPrimary),
                maxLines: 3,
                decoration: const InputDecoration(hintText: 'Brief description of this group...'),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: AppTheme.primary, strokeWidth: 2))
                      : const Text('Create Group'),
                ),
              ),
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
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
      );
}
