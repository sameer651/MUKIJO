import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/app_theme.dart';
import 'core/session.dart';
import 'screens/main_shell.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/groups/groups_screen.dart';
import 'screens/groups/group_detail_screen.dart';
import 'screens/groups/add_group_screen.dart';
import 'screens/groups/add_member_screen.dart';
import 'screens/events/events_screen.dart';
import 'screens/events/event_detail_screen.dart';
import 'screens/events/add_event_screen.dart';
import 'screens/courses/courses_screen.dart';
import 'screens/courses/course_detail_screen.dart';
import 'screens/courses/add_course_screen.dart';
import 'screens/payments/payments_screen.dart';
import 'screens/payments/add_payment_screen.dart';
import 'screens/members/members_screen.dart';
import 'screens/fundraising/fundraising_screen.dart';
import 'screens/fundraising/add_campaign_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final isLoggedIn = await Session.isLoggedIn();
  runApp(
    ProviderScope(
      child: MukijoApp(isLoggedIn: isLoggedIn),
    ),
  );
}

class MukijoApp extends ConsumerWidget {
  final bool isLoggedIn;
  const MukijoApp({super.key, required this.isLoggedIn});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = _buildRouter(isLoggedIn);
    return MaterialApp.router(
      title: 'Mukijo Club',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }

  GoRouter _buildRouter(bool startLoggedIn) {
    return GoRouter(
      initialLocation: startLoggedIn ? '/dashboard' : '/login',
      routes: [
        GoRoute(
          path: '/login',
          name: 'login',
          builder: (_, __) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          name: 'register',
          builder: (_, __) => const RegisterScreen(),
        ),
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) {
            return MainShell(navigationShell: navigationShell);
          },
          branches: [
            // Home / Dashboard Branch
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/dashboard',
                  name: 'dashboard',
                  builder: (_, __) => const DashboardScreen(),
                ),
              ],
            ),
            // Groups Branch
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/groups',
                  name: 'groups',
                  builder: (_, __) => const GroupsScreen(),
                  routes: [
                    GoRoute(
                      path: 'add',
                      name: 'add-group',
                      builder: (_, __) => const AddGroupScreen(),
                    ),
                    GoRoute(
                      path: ':groupId',
                      name: 'group-detail',
                      builder: (_, state) => GroupDetailScreen(
                        groupId: int.parse(state.pathParameters['groupId']!),
                      ),
                      routes: [
                        GoRoute(
                          path: 'add-member',
                          name: 'add-member',
                          builder: (_, state) => AddMemberScreen(
                            groupId: int.parse(state.pathParameters['groupId']!),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
            // Events Branch
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/events',
                  name: 'events',
                  builder: (_, __) => const EventsScreen(),
                  routes: [
                    GoRoute(
                      path: 'add',
                      name: 'add-event',
                      builder: (_, __) => const AddEventScreen(),
                    ),
                    GoRoute(
                      path: ':eventId',
                      name: 'event-detail',
                      builder: (_, state) => EventDetailScreen(
                        eventId: int.parse(state.pathParameters['eventId']!),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            // Courses Branch
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/courses',
                  name: 'courses',
                  builder: (_, __) => const CoursesScreen(),
                  routes: [
                    GoRoute(
                      path: 'add',
                      name: 'add-course',
                      builder: (_, __) => const AddCourseScreen(),
                    ),
                    GoRoute(
                      path: ':courseId',
                      name: 'course-detail',
                      builder: (_, state) => CourseDetailScreen(
                        courseId: int.parse(state.pathParameters['courseId']!),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        // Other top-level routes (No bottom bar for these)
        GoRoute(
          path: '/payments',
          name: 'payments',
          builder: (_, __) => const PaymentsScreen(),
          routes: [
            GoRoute(
              path: 'add',
              name: 'add-payment',
              builder: (_, __) => const AddPaymentScreen(),
            ),
          ],
        ),
        GoRoute(
          path: '/members',
          name: 'members',
          builder: (_, __) => const MembersScreen(),
        ),
        GoRoute(
          path: '/fundraising',
          name: 'fundraising',
          builder: (_, __) => const FundraisingScreen(),
          routes: [
            GoRoute(
              path: 'add',
              name: 'add-campaign',
              builder: (_, __) => const AddCampaignScreen(),
            ),
          ],
        ),
      ],
    );
  }
}
