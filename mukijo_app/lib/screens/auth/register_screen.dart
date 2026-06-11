import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../core/session.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  int _step = 0;
  bool _loading = false;
  bool _obscure = true;

  // Club Info
  final _clubNameCtrl = TextEditingController();
  final _sportCtrl = TextEditingController();
  String _country = 'India';
  String _state = '';
  String _memberCount = '1-50';

  // Personal Info
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  final List<String> _memberCounts = ['1-50', '51-100', '101-200', '201-500', '500+'];

  @override
  void dispose() {
    _clubNameCtrl.dispose();
    _sportCtrl.dispose();
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      final data = {
        'clubName': _clubNameCtrl.text.trim(),
        'country': _country,
        'state': _state,
        'memberCount': _memberCount,
        'sport': _sportCtrl.text.trim(),
        'firstName': _firstNameCtrl.text.trim(),
        'lastName': _lastNameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'password': _passwordCtrl.text.trim(),
        'aadharNumber': null,
        'hearAbout': 'App',
      };
      await ref.read(authProvider.notifier).register(data);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Registration successful! Please sign in.'),
            backgroundColor: AppTheme.success,
          ),
        );
        context.go('/login');
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

  Widget _buildStep1() {
    return Column(
      children: [
        TextFormField(
          controller: _clubNameCtrl,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            labelText: 'Club Name',
            prefixIcon: Icon(Icons.sports, color: AppTheme.textMuted),
          ),
          validator: (v) => v == null || v.isEmpty ? 'Club name is required' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _sportCtrl,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            labelText: 'Sport / Activity',
            hintText: 'e.g. Football, Cricket, Swimming',
            prefixIcon: Icon(Icons.emoji_events_outlined, color: AppTheme.textMuted),
          ),
          validator: (v) => v == null || v.isEmpty ? 'Sport is required' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          initialValue: _country,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            labelText: 'Country',
            prefixIcon: Icon(Icons.flag_outlined, color: AppTheme.textMuted),
          ),
          onChanged: (v) => _country = v,
        ),
        const SizedBox(height: 16),
        TextFormField(
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            labelText: 'State / City',
            prefixIcon: Icon(Icons.location_on_outlined, color: AppTheme.textMuted),
          ),
          onChanged: (v) => _state = v,
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          value: _memberCount,
          dropdownColor: AppTheme.bgLight,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            labelText: 'Expected Member Count',
            prefixIcon: Icon(Icons.group_outlined, color: AppTheme.textMuted),
          ),
          items: _memberCounts.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: (v) => setState(() => _memberCount = v!),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _firstNameCtrl,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(labelText: 'First Name'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextFormField(
                controller: _lastNameCtrl,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(labelText: 'Last Name'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            labelText: 'Email Address',
            prefixIcon: Icon(Icons.email_outlined, color: AppTheme.textMuted),
          ),
          validator: (v) => v == null || !v.contains('@') ? 'Enter a valid email' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: const InputDecoration(
            labelText: 'Phone Number',
            prefixIcon: Icon(Icons.phone_outlined, color: AppTheme.textMuted),
          ),
          validator: (v) => v == null || v.isEmpty ? 'Phone is required' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _passwordCtrl,
          obscureText: _obscure,
          style: const TextStyle(color: AppTheme.textPrimary),
          decoration: InputDecoration(
            labelText: 'Password',
            prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.textMuted),
            suffixIcon: IconButton(
              icon: Icon(
                _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                color: AppTheme.textMuted,
              ),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          validator: (v) => v == null || v.length < 6 ? 'Min 6 characters' : null,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _step == 0 ? () => context.go('/login') : () => setState(() => _step = 0),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Step indicator
                Row(
                  children: [
                    _StepDot(active: _step == 0, done: _step > 0, label: '1'),
                    Expanded(
                      child: Container(
                        height: 2,
                        color: _step > 0 ? AppTheme.primary : AppTheme.borderColor,
                      ),
                    ),
                    _StepDot(active: _step == 1, done: false, label: '2'),
                  ],
                ),
                const SizedBox(height: 28),
                Text(
                  _step == 0 ? 'Club Details' : 'Your Details',
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                Text(
                  _step == 0 ? 'Tell us about your club' : 'Create your admin account',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 28),
                if (_step == 0) _buildStep1() else _buildStep2(),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _loading
                        ? null
                        : () {
                            if (!_formKey.currentState!.validate()) return;
                            if (_step == 0) {
                              setState(() => _step = 1);
                            } else {
                              _register();
                            }
                          },
                    child: _loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Text(_step == 0 ? 'Next' : 'Create Account'),
                  ),
                ),
                const SizedBox(height: 20),
                if (_step == 0)
                  Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Already have an account? ', style: TextStyle(color: AppTheme.textSecondary)),
                        GestureDetector(
                          onTap: () => context.go('/login'),
                          child: const Text(
                            'Sign In',
                            style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  final bool active;
  final bool done;
  final String label;
  const _StepDot({required this.active, required this.done, required this.label});

  @override
  Widget build(BuildContext context) {
    Color color = active || done ? AppTheme.primary : AppTheme.borderColor;
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color,
        border: Border.all(color: color),
      ),
      child: Center(
        child: done
            ? const Icon(Icons.check, color: Colors.white, size: 16)
            : Text(label, style: TextStyle(color: active ? Colors.white : AppTheme.textMuted, fontWeight: FontWeight.w600)),
      ),
    );
  }
}
