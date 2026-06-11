import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/app_theme.dart';
import '../../providers/courses_provider.dart';
import '../../models/course.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/loading_shimmer.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/status_chip.dart';

class CoursesScreen extends ConsumerStatefulWidget {
  const CoursesScreen({super.key});

  @override
  ConsumerState<CoursesScreen> createState() => _CoursesScreenState();
}

class _CoursesScreenState extends ConsumerState<CoursesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final List<String> _statuses = ['All', 'Open', 'Full', 'Closed'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _statuses.length, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<Course> _filter(List<Course> courses, String tab) {
    if (tab == 'All') return courses;
    return courses.where((c) => c.status.toLowerCase() == tab.toLowerCase()).toList();
  }

  @override
  Widget build(BuildContext context) {
    final coursesAsync = ref.watch(coursesProvider);
    final summaryAsync = ref.watch(coursesSummaryProvider);

    return Scaffold(
      backgroundColor: AppTheme.bgLight,
      appBar: AppBar(
        title: const Text('Courses & Academies'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: _statuses.map((s) => Tab(text: s)).toList(),
        ),
      ),
      body: Column(
        children: [
          // Summary Row
          summaryAsync.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (s) => Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                children: [
                  Expanded(child: MiniStatCard(label: 'Total', value: '${s['total_courses'] ?? 0}', icon: Icons.school, color: AppTheme.primary)),
                  const SizedBox(width: 8),
                  Expanded(child: MiniStatCard(label: 'Open', value: '${s['open_courses'] ?? 0}', icon: Icons.lock_open, color: AppTheme.success)),
                  const SizedBox(width: 8),
                  Expanded(child: MiniStatCard(label: 'Revenue', value: '₹${s['course_revenue'] ?? 0}', icon: Icons.attach_money, color: AppTheme.warning)),
                ],
              ),
            ),
          ).animate().fade(),
          Expanded(
            child: coursesAsync.when(
              loading: () => const LoadingShimmer(itemCount: 4),
              error: (e, _) => Center(child: Text(e.toString(), style: const TextStyle(color: AppTheme.error))),
              data: (courses) => TabBarView(
                controller: _tabController,
                children: _statuses.map((tab) {
                  final filtered = _filter(courses, tab);
                  if (filtered.isEmpty) {
                    return EmptyState(
                      icon: Icons.school_outlined,
                      title: 'No ${tab == 'All' ? '' : tab.toLowerCase()} courses',
                      subtitle: 'Create a new course to get started',
                      actionLabel: tab == 'All' ? 'Create Course' : null,
                      onAction: tab == 'All' ? () => context.push('/courses/add') : null,
                    ).animate().fade().scale();
                  }
                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(coursesProvider);
                      ref.invalidate(coursesSummaryProvider);
                    },
                    color: AppTheme.primary,
                    backgroundColor: AppTheme.bgCard,
                    child: ListView.builder(
                      padding: const EdgeInsets.only(top: 16, left: 16, right: 16, bottom: 80),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        return _CourseCard(course: filtered[index])
                            .animate()
                            .fade(delay: (50 * index).ms)
                            .slideY(begin: 0.1);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/courses/add'),
        icon: const Icon(Icons.add),
        label: const Text('New Course'),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  final Course course;
  const _CourseCard({required this.course});

  @override
  Widget build(BuildContext context) {
    final fillPercent = course.capacity > 0 ? course.registrationCount / course.capacity : 0.0;

    return GestureDetector(
      onTap: () => context.push('/courses/${course.id}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(20),
          boxShadow: AppTheme.softShadow,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.warning.withValues(alpha: 0.15), 
                    borderRadius: BorderRadius.circular(16)
                  ),
                  child: const Icon(Icons.school, color: AppTheme.warning, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(course.title, style: const TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 4),
                      if (course.instructor != null)
                        Text('by ${course.instructor}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
                StatusChip(status: course.status),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _Tag(course.category, AppTheme.primary),
                if (course.level != null) ...[const SizedBox(width: 8), _Tag(course.level!, AppTheme.info)],
                const Spacer(),
                if (course.fee > 0)
                  Text('₹${course.fee}', style: const TextStyle(color: AppTheme.success, fontWeight: FontWeight.w800, fontSize: 16))
                else
                  const Text('FREE', style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w800, fontSize: 16)),
              ],
            ),
            const SizedBox(height: 16),
            // Capacity bar
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${course.registrationCount}/${course.capacity} enrolled', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                    Text('${course.availableSeats} seats left', style: TextStyle(color: course.availableSeats > 0 ? AppTheme.success : AppTheme.error, fontSize: 12, fontWeight: FontWeight.w700)),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: fillPercent.clamp(0.0, 1.0),
                    backgroundColor: AppTheme.surfaceLight,
                    valueColor: AlwaysStoppedAnimation(fillPercent >= 1.0 ? AppTheme.error : AppTheme.primary),
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final Color color;
  const _Tag(this.label, this.color);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
        child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700)),
      );
}
