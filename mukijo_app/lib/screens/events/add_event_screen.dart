import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/app_theme.dart';
import '../../core/session.dart';
import '../../providers/events_provider.dart';
import '../../providers/groups_provider.dart';
import '../../models/group.dart';

class AddEventScreen extends ConsumerStatefulWidget {
  const AddEventScreen({super.key});

  @override
  ConsumerState<AddEventScreen> createState() => _AddEventScreenState();
}

class _AddEventScreenState extends ConsumerState<AddEventScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _feeCtrl = TextEditingController(text: '0');
  final _maxCtrl = TextEditingController();

  String _type = 'Match';
  String? _date;
  String? _time;
  int? _selectedGroupId;
  bool _isPublic = true;
  bool _allowGuest = false;
  bool _allowWaiting = false;
  bool _attendanceTracking = true;
  bool _loading = false;

  final List<String> _types = ['Match', 'Training', 'Tournament', 'Meeting', 'Trial', 'Other'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _locationCtrl.dispose();
    _descCtrl.dispose();
    _feeCtrl.dispose();
    _maxCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 1000)),
      builder: (ctx, child) => Theme(
        data: ThemeData.dark().copyWith(colorScheme: const ColorScheme.dark(primary: AppTheme.primary)),
        child: child!,
      ),
    );
    if (d != null) setState(() => _date = d.toIso8601String().split('T')[0]);
  }

  Future<void> _pickTime() async {
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (ctx, child) => Theme(
        data: ThemeData.dark().copyWith(colorScheme: const ColorScheme.dark(primary: AppTheme.primary)),
        child: child!,
      ),
    );
    if (t != null) {
      setState(() => _time = '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}');
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_date == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a date'), backgroundColor: AppTheme.error));
      return;
    }
    if (_time == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a time'), backgroundColor: AppTheme.error));
      return;
    }
    if (_selectedGroupId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a group'), backgroundColor: AppTheme.error));
      return;
    }

    setState(() => _loading = true);
    try {
      final ownerId = await Session.getOwnerId();
      await ref.read(eventsNotifierProvider.notifier).createEvent(_selectedGroupId!, {
        'name': _nameCtrl.text.trim(),
        'type': _type,
        'date': _date,
        'time': _time,
        'location': _locationCtrl.text.trim().isEmpty ? null : _locationCtrl.text.trim(),
        'description': _descCtrl.text.trim().isEmpty ? null : _descCtrl.text.trim(),
        'fee': int.tryParse(_feeCtrl.text) ?? 0,
        'max_participants': _maxCtrl.text.isEmpty ? null : int.tryParse(_maxCtrl.text),
        'is_public': _isPublic,
        'allow_guest': _allowGuest,
        'allow_waiting_list': _allowWaiting,
        'attendance_tracking': _attendanceTracking,
        'owner_id': ownerId,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Event created!'), backgroundColor: AppTheme.success));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.error));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final groupsAsync = ref.watch(groupsProvider);
    final groups = groupsAsync.maybeWhen(data: (g) => g, orElse: () => <Group>[]);

    return Scaffold(
      appBar: AppBar(title: const Text('Create Event')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Label('Event Name'),
              TextFormField(
                controller: _nameCtrl,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(hintText: 'e.g. Champions League Match'),
                validator: (v) => v == null || v.isEmpty ? 'Name required' : null,
              ),
              const SizedBox(height: 16),
              _Label('Event Type'),
              DropdownButtonFormField<String>(
                value: _type,
                dropdownColor: AppTheme.bgLight,
                style: const TextStyle(color: AppTheme.textPrimary),
                items: _types.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                onChanged: (v) => setState(() => _type = v!),
                decoration: const InputDecoration(),
              ),
              const SizedBox(height: 16),
              _Label('Group'),
              DropdownButtonFormField<int>(
                value: _selectedGroupId,
                dropdownColor: AppTheme.bgLight,
                style: const TextStyle(color: AppTheme.textPrimary),
                hint: const Text('Select group', style: TextStyle(color: AppTheme.textMuted)),
                items: groups.map((g) => DropdownMenuItem(value: g.id, child: Text(g.groupName))).toList(),
                onChanged: (v) => setState(() => _selectedGroupId = v),
                decoration: const InputDecoration(),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Label('Date'),
                        GestureDetector(
                          onTap: _pickDate,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppTheme.bgLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.borderColor),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_today, color: AppTheme.textMuted, size: 16),
                                const SizedBox(width: 8),
                                Text(_date ?? 'Pick date', style: TextStyle(color: _date != null ? AppTheme.textPrimary : AppTheme.textMuted, fontSize: 14)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Label('Time'),
                        GestureDetector(
                          onTap: _pickTime,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            decoration: BoxDecoration(
                              color: AppTheme.bgLight,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.borderColor),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.access_time, color: AppTheme.textMuted, size: 16),
                                const SizedBox(width: 8),
                                Text(_time ?? 'Pick time', style: TextStyle(color: _time != null ? AppTheme.textPrimary : AppTheme.textMuted, fontSize: 14)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _Label('Location (optional)'),
              TextFormField(
                controller: _locationCtrl,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(hintText: 'e.g. City Stadium, Ground A'),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      _Label('Fee (₹)'),
                      TextFormField(
                        controller: _feeCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: AppTheme.textPrimary),
                        decoration: const InputDecoration(hintText: '0'),
                      ),
                    ]),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      _Label('Max Participants'),
                      TextFormField(
                        controller: _maxCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: AppTheme.textPrimary),
                        decoration: const InputDecoration(hintText: 'No limit'),
                      ),
                    ]),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _Label('Description (optional)'),
              TextFormField(
                controller: _descCtrl,
                maxLines: 3,
                style: const TextStyle(color: AppTheme.textPrimary),
                decoration: const InputDecoration(hintText: 'Event details, rules, instructions...'),
              ),
              const SizedBox(height: 16),
              // Toggles
              _ToggleTile('Public Event', _isPublic, (v) => setState(() => _isPublic = v)),
              _ToggleTile('Allow Guest Registration', _allowGuest, (v) => setState(() => _allowGuest = v)),
              _ToggleTile('Enable Waiting List', _allowWaiting, (v) => setState(() => _allowWaiting = v)),
              _ToggleTile('Attendance Tracking', _attendanceTracking, (v) => setState(() => _attendanceTracking = v)),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Create Event'),
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

class _ToggleTile extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _ToggleTile(this.label, this.value, this.onChanged);

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.borderColor)),
        child: SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(label, style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14)),
          value: value,
          activeColor: AppTheme.primary,
          onChanged: onChanged,
        ),
      );
}
