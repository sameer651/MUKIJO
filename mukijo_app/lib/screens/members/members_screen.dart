import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/app_theme.dart';
import '../../providers/groups_provider.dart';
import '../../models/member.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_shimmer.dart';

class MembersScreen extends ConsumerStatefulWidget {
  const MembersScreen({super.key});

  @override
  ConsumerState<MembersScreen> createState() => _MembersScreenState();
}

class _MembersScreenState extends ConsumerState<MembersScreen> {
  String _search = '';
  String? _selectedGroup;

  Color _roleColor(String role) {
    switch (role.toLowerCase()) {
      case 'coach': return AppTheme.success;
      case 'parent': return AppTheme.info;
      case 'player': return AppTheme.primary;
      case 'referee': return AppTheme.warning;
      default: return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final allMembersAsync = ref.watch(allMembersProvider);
    final groupsAsync = ref.watch(groupsProvider);
    final groups = groupsAsync.maybeWhen(data: (g) => g, orElse: () => []);

    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      appBar: AppBar(
        title: const Text('All Members'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
      ),
      body: allMembersAsync.when(
        loading: () => const LoadingShimmer(itemCount: 6),
        error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.error))),
        data: (allMembers) {
          // Filter
          var filtered = allMembers;
          if (_search.isNotEmpty) {
            filtered = filtered.where((m) =>
              m.fullName.toLowerCase().contains(_search.toLowerCase()) ||
              m.email.toLowerCase().contains(_search.toLowerCase())
            ).toList();
          }
          if (_selectedGroup != null) {
            filtered = filtered.where((m) => m.groupName == _selectedGroup).toList();
          }

          return Column(
            children: [
              // Search & filter bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      style: const TextStyle(color: AppTheme.textPrimary),
                      onChanged: (v) => setState(() => _search = v),
                      decoration: InputDecoration(
                        hintText: 'Search members...',
                        prefixIcon: const Icon(Icons.search, color: AppTheme.textMuted),
                        suffixIcon: _search.isNotEmpty
                            ? IconButton(icon: const Icon(Icons.clear, color: AppTheme.textMuted), onPressed: () => setState(() => _search = ''))
                            : null,
                      ),
                    ).animate().fade(),
                    if (groups.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _FilterChip('All', _selectedGroup == null, () => setState(() => _selectedGroup = null)),
                            ...groups.map((g) => _FilterChip(g.groupName, _selectedGroup == g.groupName, () => setState(() => _selectedGroup = g.groupName))),
                          ],
                        ),
                      ).animate().fade(delay: 100.ms),
                    ],
                    Padding(
                      padding: const EdgeInsets.only(top: 12, left: 4),
                      child: Text('${filtered.length} members', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? EmptyState(
                        icon: Icons.people_outline,
                        title: _search.isNotEmpty ? 'No results for "$_search"' : 'No members found',
                        subtitle: 'Members added to groups will appear here',
                      ).animate().fade().scale()
                    : RefreshIndicator(
                        onRefresh: () async => ref.invalidate(allMembersProvider),
                        color: AppTheme.primary,
                        backgroundColor: AppTheme.bgCard,
                        child: ListView.builder(
                          padding: const EdgeInsets.only(top: 8, left: 16, right: 16, bottom: 80),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final m = filtered[index];
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(color: AppTheme.bgCard, borderRadius: BorderRadius.circular(20), boxShadow: AppTheme.softShadow),
                              child: Row(children: [
                                CircleAvatar(
                                  radius: 26,
                                  backgroundColor: _roleColor(m.role).withValues(alpha: 0.15),
                                  child: Text(m.firstName.isNotEmpty ? m.firstName[0].toUpperCase() : '?', style: TextStyle(color: _roleColor(m.role), fontWeight: FontWeight.w800, fontSize: 20)),
                                ),
                                const SizedBox(width: 16),
                                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(m.fullName, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w800, fontSize: 15)),
                                  const SizedBox(height: 2),
                                  Text(m.email, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                                  if (m.groupName != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(m.groupName!, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                    ),
                                ])),
                                Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisAlignment: MainAxisAlignment.center, children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(color: _roleColor(m.role).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                                    child: Text(m.role, style: TextStyle(color: _roleColor(m.role), fontSize: 11, fontWeight: FontWeight.w700)),
                                  ),
                                  if (m.phone.isNotEmpty) ...[
                                    const SizedBox(height: 8),
                                    Text(m.phone, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                  ],
                                ]),
                              ]),
                            ).animate().fade(delay: (50 * index).ms).slideX(begin: 0.1);
                          },
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip(this.label, this.selected, this.onTap);

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: selected ? AppTheme.primary : AppTheme.bgCard,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: selected ? AppTheme.primary : AppTheme.borderColor),
            boxShadow: selected ? AppTheme.softShadow : null,
          ),
          child: Text(label, style: TextStyle(color: selected ? Colors.white : AppTheme.textSecondary, fontSize: 13, fontWeight: selected ? FontWeight.w700 : FontWeight.w500)),
        ),
      );
}
