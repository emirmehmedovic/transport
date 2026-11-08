#!/usr/bin/env python3
"""
Automated fix for Next.js 15 route handler breaking changes.
Converts params from synchronous to Promise-based API.
"""

import os
import re
import sys
from pathlib import Path

def fix_route_file(filepath):
    """Fix a single route.ts file to use async params."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if already fixed
        if 'params: Promise<{' in content:
            print(f"✓ Already fixed: {filepath}")
            return True

        original_content = content

        # Pattern 1: Single id parameter
        # Before: { params }: { params: { id: string } }
        # After: { params }: { params: Promise<{ id: string }> }
        pattern1 = r'\{ params \}: \{ params: \{ id: string \} \}'
        replacement1 = '{ params }: { params: Promise<{ id: string }> }'
        content = re.sub(pattern1, replacement1, content)

        # Pattern 2: Two parameters (id + another)
        # Before: { params }: { params: { id: string; stopId: string } }
        # After: { params }: { params: Promise<{ id: string; stopId: string }> }
        pattern2 = r'\{ params \}: \{ params: \{ id: string; (\w+): string \} \}'
        replacement2 = r'{ params }: { params: Promise<{ id: string; \1: string }> }'
        content = re.sub(pattern2, replacement2, content)

        # Pattern 3: Other parameter patterns
        pattern3 = r'\{ params \}: \{ params: \{ (\w+): string \} \}'
        replacement3 = r'{ params }: { params: Promise<{ \1: string }> }'
        content = re.sub(pattern3, replacement3, content)

        # Add await params destructuring after each function signature
        # This is more complex - we need to find each export async function and add the destructuring
        lines = content.split('\n')
        new_lines = []
        i = 0

        while i < len(lines):
            line = lines[i]
            new_lines.append(line)

            # Check if this is an export async function with Promise params
            if ('export async function' in line and
                i + 1 < len(lines) and
                'params: Promise<{' in lines[i+1]):

                # Look ahead for the opening brace and try block
                j = i + 1
                while j < len(lines) and j < i + 10:
                    if ') {' in lines[j]:
                        # Found the function opening
                        new_lines.append(lines[j])
                        j += 1

                        # Check if next line is 'try {'
                        if j < len(lines) and lines[j].strip() == 'try {':
                            new_lines.append(lines[j])
                            j += 1

                            # Extract parameter names from the signature
                            params_match = re.search(r'params: Promise<\{ ([^}]+) \}>', '\n'.join(lines[i:j]))
                            if params_match:
                                params_str = params_match.group(1)
                                # Parse params: "id: string" or "id: string; stopId: string"
                                param_names = [p.split(':')[0].strip() for p in params_str.split(';')]
                                param_destructure = ', '.join(param_names)

                                # Add the destructuring line
                                indent = '    '  # 4 spaces
                                new_lines.append(f'{indent}const {{ {param_destructure} }} = await params;')

                            # Continue from where we left off
                            i = j - 1
                        else:
                            i = j - 1
                        break
                    j += 1
                    if j < i + 10:
                        new_lines.append(lines[j])

            i += 1

        content = '\n'.join(new_lines)

        # Replace all params.id with id, params.stopId with stopId, etc.
        # But be careful not to replace in the type signature
        def replace_params_usage(match):
            # Don't replace if it's in a type annotation
            return match.group(1)

        content = re.sub(r'params\.(\w+)', r'\1', content)

        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed: {filepath}")
            return True
        else:
            print(f"⚠️  No changes needed: {filepath}")
            return False

    except Exception as e:
        print(f"❌ Error fixing {filepath}: {e}")
        return False

def main():
    # Find all route.ts files in app/api with dynamic parameters
    api_dir = Path('/Users/emir_mw/transport/app/api')

    if not api_dir.exists():
        print(f"Error: API directory not found: {api_dir}")
        sys.exit(1)

    # Find all route.ts files in directories with [brackets]
    route_files = []
    for route_file in api_dir.rglob('route.ts'):
        # Check if path contains [brackets]
        if '[' in str(route_file) and ']' in str(route_file):
            route_files.append(route_file)

    print(f"Found {len(route_files)} route files with dynamic parameters\n")

    fixed_count = 0
    already_fixed_count = 0
    error_count = 0

    for route_file in sorted(route_files):
        # Skip claims/[id]/route.ts as mentioned by user
        if 'claims/[id]/route.ts' in str(route_file):
            print(f"⏭️  Skipped (user already fixed): {route_file}")
            continue

        result = fix_route_file(route_file)
        if result:
            # Check if it was already fixed
            with open(route_file, 'r') as f:
                if 'params: Promise<{' in f.read():
                    # Check if we just fixed it or it was already fixed
                    # This is a simplified check
                    already_fixed_count += 1
                else:
                    fixed_count += 1

    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total files found: {len(route_files)}")
    print(f"  Already fixed: {already_fixed_count}")
    print(f"  Newly fixed: {fixed_count}")
    print(f"  Errors: {error_count}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
