import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../providers/groups_provider.dart';

class AddMemberScreen extends ConsumerStatefulWidget {
  final int groupId;
  const AddMemberScreen({super.key, required this.groupId});

  @override
  ConsumerState<AddMemberScreen> createState() => _AddMemberScreenState();
}

class _AddMemberScreenState extends ConsumerState<AddMemberScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  String _role = 'Player';
  bool _loading = false;

  final List<String> _roles = ['Player', 'Coach', 'Parent', 'Referee', 'Manager', 'Admin', 'Member'];

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ref.read(groupsNotifierProvider.notifier).addMember(widget.groupId, {
        'first_name': _firstNameCtrl.text.trim(),
        'last_name': _lastNameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'role': _role,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Member added!'), backgroundColor: AppTheme.success),
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
      appBar: AppBar(title: const Text('Add Member')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Label('First Name'),
                        TextFormField(
                          controller: _firstNameCtrl,
                          style: const TextStyle(color: AppTheme.textPrimary),
                          decoration: const InputDecoration(hintText: 'First name'),
                          validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Label('Last Name'),
                        TextFormField(
                          controller: _lastNameCtrl,
                          style: const TextStyle(color: AppTheme.textPrimary),
                          decoration: const InputDecoration(hintText: 'Last name'),
                          validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _Label('Email Address'),
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(hintText: 'member@example.com'),
                validator: (v) => v == null || !v.contains('@') ? 'Valid email required' : null,
              ),
              const SizedBox(height: 16),
              _Label('Phone Number'),
              TextFormField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(hintText: '10-digit phone number'),
                validator: (v) => v == null || v.isEmpty ? 'Phone required' : null,
              ),
              const SizedBox(height: 16),
              _Label('Role'),
              DropdownButtonFormField<String>(
                value: _role,
                dropdownColor: AppTheme.bgLight,
                style: const TextStyle(color: AppTheme.textPrimary),
                items: _roles.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                onChanged: (v) => setState(() => _role = v!),
                decoration: const InputDecoration(),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Add Member'),
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
