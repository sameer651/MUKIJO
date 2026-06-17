import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../core/session.dart';
import '../../providers/fundraising_provider.dart';

class AddCampaignScreen extends ConsumerStatefulWidget {
  const AddCampaignScreen({super.key});

  @override
  ConsumerState<AddCampaignScreen> createState() => _AddCampaignScreenState();
}

class _AddCampaignScreenState extends ConsumerState<AddCampaignScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _goalCtrl = TextEditingController();
  final _groupCtrl = TextEditingController();
  String? _deadline;
  bool _loading = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _goalCtrl.dispose();
    _groupCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDeadline() async {
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 30)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 730)),
      builder: (ctx, child) => Theme(data: ThemeData.dark().copyWith(colorScheme: const ColorScheme.dark(primary: AppTheme.primary)), child: child!),
    );
    if (d != null) setState(() => _deadline = d.toIso8601String().split('T')[0]);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final ownerId = await Session.getOwnerId();
      await ref.read(fundraisingNotifierProvider.notifier).createCampaign({
        'owner_id': ownerId,
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'goal': int.parse(_goalCtrl.text.trim()),
        'deadline': _deadline,
        'group_name': _groupCtrl.text.trim().isEmpty ? null : _groupCtrl.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Campaign created!'), backgroundColor: AppTheme.success));
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
    return Scaffold(
      appBar: AppBar(title: const Text('Create Campaign')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _Label('Campaign Title *'),
            TextFormField(controller: _titleCtrl, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'e.g. New Jerseys Fund'), validator: (v) => v == null || v.isEmpty ? 'Title required' : null),
            const SizedBox(height: 16),
            _Label('Fundraising Goal (₹) *'),
            TextFormField(controller: _goalCtrl, keyboardType: TextInputType.number, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'e.g. 50000'), validator: (v) {
              if (v == null || v.isEmpty) return 'Goal required';
              if ((int.tryParse(v) ?? 0) <= 0) return 'Enter a valid goal amount';
              return null;
            }),
            const SizedBox(height: 16),
            _Label('Description'),
            TextFormField(controller: _descCtrl, maxLines: 3, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'Describe the purpose of this campaign...')),
            const SizedBox(height: 16),
            _Label('For Group (optional)'),
            TextFormField(controller: _groupCtrl, style: const TextStyle(color: AppTheme.textPrimary), decoration: const InputDecoration(hintText: 'Leave blank for club-wide')),
            const SizedBox(height: 16),
            _Label('Deadline (optional)'),
            GestureDetector(
              onTap: _pickDeadline,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(color: AppTheme.bgLight, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)),
                child: Row(children: [
                  const Icon(Icons.calendar_today, color: AppTheme.textMuted, size: 16),
                  const SizedBox(width: 8),
                  Text(_deadline ?? 'No deadline', style: TextStyle(color: _deadline != null ? AppTheme.textPrimary : AppTheme.textMuted, fontSize: 14)),
                  const Spacer(),
                  if (_deadline != null) GestureDetector(onTap: () => setState(() => _deadline = null), child: const Icon(Icons.clear, color: AppTheme.textMuted, size: 16)),
                ]),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(width: double.infinity, child: ElevatedButton(onPressed: _loading ? null : _submit, child: _loading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: AppTheme.primary, strokeWidth: 2)) : const Text('Launch Campaign'))),
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
