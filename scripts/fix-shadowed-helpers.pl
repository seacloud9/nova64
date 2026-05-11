#!/usr/bin/env perl
# Fix carts where a local helper function shares a name with a NAMESPACE_MAP method,
# and the namespace rewrite has produced `function nova64.GROUP.METHOD(args)` (illegal).
# Strategy:
#   1. Find every `function nova64.GROUP.METHOD(args) {` declaration in the file.
#   2. Rename it to `function _local_METHOD(args) {` (legal local function).
#   3. Replace every `nova64.GROUP.METHOD(` call within the same file with `_local_METHOD(`.
# Only touches carts that contain at least one `function nova64.X.Y(` line.

use strict;
use warnings;

for my $file (@ARGV) {
  open my $fh, '<', $file or do { warn "skip $file: $!\n"; next };
  local $/;
  my $src = <$fh>;
  close $fh;

  # Collect (group, method) pairs from broken function decls.
  my @pairs;
  while ($src =~ /function\s+nova64\.([a-zA-Z_]+)\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g) {
    push @pairs, [$1, $2];
  }
  next unless @pairs;

  for my $p (@pairs) {
    my ($grp, $name) = @$p;
    my $local = "_local_$name";
    # Rename the declaration.
    $src =~ s/\bfunction\s+nova64\.\Q$grp\E\.\Q$name\E\s*\(/function $local(/g;
    # Replace remaining call sites of nova64.grp.method.
    $src =~ s/\bnova64\.\Q$grp\E\.\Q$name\E\b/$local/g;
  }

  open my $out, '>', $file or die "write $file: $!\n";
  print $out $src;
  close $out;
  print "fixed $file\n";
}
