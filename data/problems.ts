import { CodingProblem } from "@/types";

/**
 * 30 curated coding problems across Easy, Medium, Hard difficulties.
 * AI selects from this set based on user's qualification, understanding level,
 * and chosen difficulty.
 *
 * Distribution: 10 Easy, 12 Medium, 8 Hard
 */
export const CODING_PROBLEMS: CodingProblem[] = [
  // ─── EASY (10 problems) ─────────────────────

  {
    id: "easy-001",
    title: "Two Sum",
    difficulty: "easy",
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
      {
        input: "nums = [3,2,4], target = 6",
        output: "[1,2]",
      },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    starterCode: {
      python: "def two_sum(nums: list[int], target: int) -> list[int]:\n    pass",
      javascript:
        "function twoSum(nums, target) {\n    // Your code here\n}",
      java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n    }\n};",
      go: "func twoSum(nums []int, target int) []int {\n    // Your code here\n}",
    },
    tags: ["array", "hash-table"],
  },
  {
    id: "easy-002",
    title: "Valid Parentheses",
    difficulty: "easy",
    description:
      "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'",
    ],
    starterCode: {
      python: "def is_valid(s: str) -> bool:\n    pass",
      javascript: "function isValid(s) {\n    // Your code here\n}",
      java: "class Solution {\n    public boolean isValid(String s) {\n        // Your code here\n    }\n}",
      cpp: "#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Your code here\n    }\n};",
      go: "func isValid(s string) bool {\n    // Your code here\n}",
    },
    tags: ["string", "stack"],
  },
  {
    id: "easy-003",
    title: "Reverse Linked List",
    difficulty: "easy",
    description:
      "Given the `head` of a singly linked list, reverse the list, and return the reversed list.",
    examples: [
      { input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" },
      { input: "head = [1,2]", output: "[2,1]" },
      { input: "head = []", output: "[]" },
    ],
    constraints: [
      "The number of nodes in the list is in the range [0, 5000].",
      "-5000 <= Node.val <= 5000",
    ],
    starterCode: {
      python:
        "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_list(head: ListNode) -> ListNode:\n    pass",
      javascript:
        "function reverseList(head) {\n    // Your code here\n}",
      java: "class Solution {\n    public ListNode reverseList(ListNode head) {\n        // Your code here\n    }\n}",
      cpp: "class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Your code here\n    }\n};",
      go: "func reverseList(head *ListNode) *ListNode {\n    // Your code here\n}",
    },
    tags: ["linked-list", "recursion"],
  },
  {
    id: "easy-004",
    title: "Maximum Subarray",
    difficulty: "easy",
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
    examples: [
      {
        input: "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        output: "6",
        explanation:
          "The subarray [4,-1,2,1] has the largest sum 6.",
      },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    starterCode: {
      python: "def max_sub_array(nums: list[int]) -> int:\n    pass",
      javascript:
        "function maxSubArray(nums) {\n    // Your code here\n}",
      java: "class Solution {\n    public int maxSubArray(int[] nums) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Your code here\n    }\n};",
      go: "func maxSubArray(nums []int) int {\n    // Your code here\n}",
    },
    tags: ["array", "dynamic-programming", "divide-and-conquer"],
  },
  {
    id: "easy-005",
    title: "Merge Two Sorted Lists",
    difficulty: "easy",
    description:
      "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.",
    examples: [
      {
        input: "list1 = [1,2,4], list2 = [1,3,4]",
        output: "[1,1,2,3,4,4]",
      },
      { input: "list1 = [], list2 = []", output: "[]" },
      { input: "list1 = [], list2 = [0]", output: "[0]" },
    ],
    constraints: [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order.",
    ],
    starterCode: {
      python:
        "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef merge_two_lists(list1: ListNode, list2: ListNode) -> ListNode:\n    pass",
      javascript:
        "function mergeTwoLists(list1, list2) {\n    // Your code here\n}",
      java: "class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        // Your code here\n    }\n}",
      cpp: "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        // Your code here\n    }\n};",
      go: "func mergeTwoLists(list1 *ListNode, list2 *ListNode) *ListNode {\n    // Your code here\n}",
    },
    tags: ["linked-list", "recursion"],
  },
  {
    id: "easy-006",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "easy",
    description:
      "You are given an array `prices` where `prices[i]` is the price of a given stock on the ith day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    examples: [
      {
        input: "prices = [7,1,5,3,6,4]",
        output: "5",
        explanation:
          "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.",
      },
      {
        input: "prices = [7,6,4,3,1]",
        output: "0",
        explanation: "No transactions are done, max profit = 0.",
      },
    ],
    constraints: [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4",
    ],
    starterCode: {
      python: "def max_profit(prices: list[int]) -> int:\n    pass",
      javascript:
        "function maxProfit(prices) {\n    // Your code here\n}",
      java: "class Solution {\n    public int maxProfit(int[] prices) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        // Your code here\n    }\n};",
      go: "func maxProfit(prices []int) int {\n    // Your code here\n}",
    },
    tags: ["array", "dynamic-programming"],
  },
  {
    id: "easy-007",
    title: "Valid Palindrome",
    difficulty: "easy",
    description:
      'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.',
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: "true",
        explanation:
          '"amanaplanacanalpanama" is a palindrome.',
      },
      {
        input: 's = "race a car"',
        output: "false",
      },
    ],
    constraints: [
      "1 <= s.length <= 2 * 10^5",
      "s consists only of printable ASCII characters.",
    ],
    starterCode: {
      python: "def is_palindrome(s: str) -> bool:\n    pass",
      javascript:
        "function isPalindrome(s) {\n    // Your code here\n}",
      java: "class Solution {\n    public boolean isPalindrome(String s) {\n        // Your code here\n    }\n}",
      cpp: "#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isPalindrome(string s) {\n        // Your code here\n    }\n};",
      go: "func isPalindrome(s string) bool {\n    // Your code here\n}",
    },
    tags: ["string", "two-pointers"],
  },
  {
    id: "easy-008",
    title: "Contains Duplicate",
    difficulty: "easy",
    description:
      "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    examples: [
      { input: "nums = [1,2,3,1]", output: "true" },
      { input: "nums = [1,2,3,4]", output: "false" },
      { input: "nums = [1,1,1,3,3,4,3,2,4,2]", output: "true" },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9",
    ],
    starterCode: {
      python:
        "def contains_duplicate(nums: list[int]) -> bool:\n    pass",
      javascript:
        "function containsDuplicate(nums) {\n    // Your code here\n}",
      java: "class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        // Your code here\n    }\n};",
      go: "func containsDuplicate(nums []int) bool {\n    // Your code here\n}",
    },
    tags: ["array", "hash-table", "sorting"],
  },
  {
    id: "easy-009",
    title: "Climbing Stairs",
    difficulty: "easy",
    description:
      "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    examples: [
      {
        input: "n = 2",
        output: "2",
        explanation: "1. 1 step + 1 step\n2. 2 steps",
      },
      {
        input: "n = 3",
        output: "3",
        explanation:
          "1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step",
      },
    ],
    constraints: ["1 <= n <= 45"],
    starterCode: {
      python: "def climb_stairs(n: int) -> int:\n    pass",
      javascript:
        "function climbStairs(n) {\n    // Your code here\n}",
      java: "class Solution {\n    public int climbStairs(int n) {\n        // Your code here\n    }\n}",
      cpp: "class Solution {\npublic:\n    int climbStairs(int n) {\n        // Your code here\n    }\n};",
      go: "func climbStairs(n int) int {\n    // Your code here\n}",
    },
    tags: ["math", "dynamic-programming", "memoization"],
  },
  {
    id: "easy-010",
    title: "Balanced Binary Tree",
    difficulty: "easy",
    description:
      "Given a binary tree, determine if it is height-balanced.\n\nA height-balanced binary tree is a binary tree in which the depth of the two subtrees of every node never differs by more than one.",
    examples: [
      { input: "root = [3,9,20,null,null,15,7]", output: "true" },
      { input: "root = [1,2,2,3,3,null,null,4,4]", output: "false" },
      { input: "root = []", output: "true" },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 5000].",
      "-10^4 <= Node.val <= 10^4",
    ],
    starterCode: {
      python:
        "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef is_balanced(root: TreeNode) -> bool:\n    pass",
      javascript:
        "function isBalanced(root) {\n    // Your code here\n}",
      java: "class Solution {\n    public boolean isBalanced(TreeNode root) {\n        // Your code here\n    }\n}",
      cpp: "class Solution {\npublic:\n    bool isBalanced(TreeNode* root) {\n        // Your code here\n    }\n};",
      go: "func isBalanced(root *TreeNode) bool {\n    // Your code here\n}",
    },
    tags: ["tree", "depth-first-search", "binary-tree"],
  },

  // ─── MEDIUM (12 problems) ───────────────────

  {
    id: "medium-001",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    description:
      "Given a string `s`, find the length of the longest substring without repeating characters.",
    examples: [
      {
        input: 's = "abcabcbb"',
        output: "3",
        explanation: 'The answer is "abc", with length 3.',
      },
      {
        input: 's = "bbbbb"',
        output: "1",
        explanation: 'The answer is "b", with length 1.',
      },
      {
        input: 's = "pwwkew"',
        output: "3",
        explanation: 'The answer is "wke", with length 3.',
      },
    ],
    constraints: [
      "0 <= s.length <= 5 * 10^4",
      "s consists of English letters, digits, symbols and spaces.",
    ],
    starterCode: {
      python:
        "def length_of_longest_substring(s: str) -> int:\n    pass",
      javascript:
        "function lengthOfLongestSubstring(s) {\n    // Your code here\n}",
      java: "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Your code here\n    }\n}",
      cpp: "#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Your code here\n    }\n};",
      go: "func lengthOfLongestSubstring(s string) int {\n    // Your code here\n}",
    },
    tags: ["hash-table", "string", "sliding-window"],
  },
  {
    id: "medium-002",
    title: "3Sum",
    difficulty: "medium",
    description:
      "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
    examples: [
      {
        input: "nums = [-1,0,1,2,-1,-4]",
        output: "[[-1,-1,2],[-1,0,1]]",
      },
      { input: "nums = [0,1,1]", output: "[]" },
      { input: "nums = [0,0,0]", output: "[[0,0,0]]" },
    ],
    constraints: [
      "3 <= nums.length <= 3000",
      "-10^5 <= nums[i] <= 10^5",
    ],
    starterCode: {
      python:
        "def three_sum(nums: list[int]) -> list[list[int]]:\n    pass",
      javascript:
        "function threeSum(nums) {\n    // Your code here\n}",
      java: "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        // Your code here\n    }\n};",
      go: "func threeSum(nums []int) [][]int {\n    // Your code here\n}",
    },
    tags: ["array", "two-pointers", "sorting"],
  },
  {
    id: "medium-003",
    title: "Group Anagrams",
    difficulty: "medium",
    description:
      'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.\n\nAn anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.',
    examples: [
      {
        input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
        output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
      },
      { input: 'strs = [""]', output: '[[""]]' },
      { input: 'strs = ["a"]', output: '[["a"]]' },
    ],
    constraints: [
      "1 <= strs.length <= 10^4",
      "0 <= strs[i].length <= 100",
      "strs[i] consists of lowercase English letters.",
    ],
    starterCode: {
      python:
        "def group_anagrams(strs: list[str]) -> list[list[str]]:\n    pass",
      javascript:
        "function groupAnagrams(strs) {\n    // Your code here\n}",
      java: "class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        // Your code here\n    }\n};",
      go: "func groupAnagrams(strs []string) [][]string {\n    // Your code here\n}",
    },
    tags: ["array", "hash-table", "string", "sorting"],
  },
  {
    id: "medium-004",
    title: "Binary Tree Level Order Traversal",
    difficulty: "medium",
    description:
      "Given the `root` of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
    examples: [
      {
        input: "root = [3,9,20,null,null,15,7]",
        output: "[[3],[9,20],[15,7]]",
      },
      { input: "root = [1]", output: "[[1]]" },
      { input: "root = []", output: "[]" },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 2000].",
      "-1000 <= Node.val <= 1000",
    ],
    starterCode: {
      python:
        "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef level_order(root: TreeNode) -> list[list[int]]:\n    pass",
      javascript:
        "function levelOrder(root) {\n    // Your code here\n}",
      java: "class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        // Your code here\n    }\n};",
      go: "func levelOrder(root *TreeNode) [][]int {\n    // Your code here\n}",
    },
    tags: ["tree", "breadth-first-search", "binary-tree"],
  },
  {
    id: "medium-005",
    title: "Product of Array Except Self",
    difficulty: "medium",
    description:
      "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in O(n) time and without using the division operation.",
    examples: [
      { input: "nums = [1,2,3,4]", output: "[24,12,8,6]" },
      { input: "nums = [-1,1,0,-3,3]", output: "[0,0,9,0,0]" },
    ],
    constraints: [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30",
      "The product of any prefix or suffix of nums fits in a 32-bit integer.",
    ],
    starterCode: {
      python:
        "def product_except_self(nums: list[int]) -> list[int]:\n    pass",
      javascript:
        "function productExceptSelf(nums) {\n    // Your code here\n}",
      java: "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        // Your code here\n    }\n};",
      go: "func productExceptSelf(nums []int) []int {\n    // Your code here\n}",
    },
    tags: ["array", "prefix-sum"],
  },
  {
    id: "medium-006",
    title: "Validate Binary Search Tree",
    difficulty: "medium",
    description:
      "Given the `root` of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST is defined as follows:\n- The left subtree of a node contains only nodes with keys less than the node's key.\n- The right subtree of a node contains only nodes with keys greater than the node's key.\n- Both the left and right subtrees must also be binary search trees.",
    examples: [
      { input: "root = [2,1,3]", output: "true" },
      {
        input: "root = [5,1,4,null,null,3,6]",
        output: "false",
        explanation:
          "The root node's value is 5 but its right child's value is 4.",
      },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [1, 10^4].",
      "-2^31 <= Node.val <= 2^31 - 1",
    ],
    starterCode: {
      python:
        "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef is_valid_bst(root: TreeNode) -> bool:\n    pass",
      javascript:
        "function isValidBST(root) {\n    // Your code here\n}",
      java: "class Solution {\n    public boolean isValidBST(TreeNode root) {\n        // Your code here\n    }\n}",
      cpp: "class Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        // Your code here\n    }\n};",
      go: "func isValidBST(root *TreeNode) bool {\n    // Your code here\n}",
    },
    tags: ["tree", "depth-first-search", "binary-search-tree"],
  },
  {
    id: "medium-007",
    title: "Coin Change",
    difficulty: "medium",
    description:
      "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.",
    examples: [
      {
        input: "coins = [1,5,10,25], amount = 30",
        output: "2",
        explanation: "30 = 25 + 5",
      },
      { input: "coins = [2], amount = 3", output: "-1" },
      { input: "coins = [1], amount = 0", output: "0" },
    ],
    constraints: [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4",
    ],
    starterCode: {
      python:
        "def coin_change(coins: list[int], amount: int) -> int:\n    pass",
      javascript:
        "function coinChange(coins, amount) {\n    // Your code here\n}",
      java: "class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Your code here\n    }\n};",
      go: "func coinChange(coins []int, amount int) int {\n    // Your code here\n}",
    },
    tags: ["array", "dynamic-programming", "breadth-first-search"],
  },
  {
    id: "medium-008",
    title: "Number of Islands",
    difficulty: "medium",
    description:
      "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
    examples: [
      {
        input:
          'grid = [\n  ["1","1","1","1","0"],\n  ["1","1","0","1","0"],\n  ["1","1","0","0","0"],\n  ["0","0","0","0","0"]\n]',
        output: "1",
      },
      {
        input:
          'grid = [\n  ["1","1","0","0","0"],\n  ["1","1","0","0","0"],\n  ["0","0","1","0","0"],\n  ["0","0","0","1","1"]\n]',
        output: "3",
      },
    ],
    constraints: [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 300",
      "grid[i][j] is '0' or '1'.",
    ],
    starterCode: {
      python:
        "def num_islands(grid: list[list[str]]) -> int:\n    pass",
      javascript:
        "function numIslands(grid) {\n    // Your code here\n}",
      java: "class Solution {\n    public int numIslands(char[][] grid) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        // Your code here\n    }\n};",
      go: "func numIslands(grid [][]byte) int {\n    // Your code here\n}",
    },
    tags: ["array", "depth-first-search", "breadth-first-search", "matrix"],
  },
  {
    id: "medium-009",
    title: "LRU Cache",
    difficulty: "medium",
    description:
      "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` Initialize the LRU cache with positive size capacity.\n- `int get(int key)` Return the value of the key if the key exists, otherwise return -1.\n- `void put(int key, int value)` Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.",
    examples: [
      {
        input:
          '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
        output: "[null, null, null, 1, null, -1, null, -1, 3, 4]",
      },
    ],
    constraints: [
      "1 <= capacity <= 3000",
      "0 <= key <= 10^4",
      "0 <= value <= 10^5",
      "At most 2 * 10^5 calls will be made to get and put.",
    ],
    starterCode: {
      python:
        "class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n\n    def get(self, key: int) -> int:\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        pass",
      javascript:
        "class LRUCache {\n    constructor(capacity) {\n        // Your code here\n    }\n\n    get(key) {\n        // Your code here\n    }\n\n    put(key, value) {\n        // Your code here\n    }\n}",
      java: "class LRUCache {\n    public LRUCache(int capacity) {\n        // Your code here\n    }\n\n    public int get(int key) {\n        // Your code here\n    }\n\n    public void put(int key, int value) {\n        // Your code here\n    }\n}",
      cpp: "class LRUCache {\npublic:\n    LRUCache(int capacity) {\n        // Your code here\n    }\n\n    int get(int key) {\n        // Your code here\n    }\n\n    void put(int key, int value) {\n        // Your code here\n    }\n};",
      go: "type LRUCache struct {\n    // Your code here\n}\n\nfunc Constructor(capacity int) LRUCache {\n    // Your code here\n}\n\nfunc (this *LRUCache) Get(key int) int {\n    // Your code here\n}\n\nfunc (this *LRUCache) Put(key int, value int) {\n    // Your code here\n}",
    },
    tags: ["hash-table", "linked-list", "design"],
  },
  {
    id: "medium-010",
    title: "Search in Rotated Sorted Array",
    difficulty: "medium",
    description:
      "There is an integer array `nums` sorted in ascending order (with distinct values). Prior to being passed to your function, `nums` is possibly rotated at an unknown pivot index `k`.\n\nGiven the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.\n\nYou must write an algorithm with O(log n) runtime complexity.",
    examples: [
      { input: "nums = [4,5,6,7,0,1,2], target = 0", output: "4" },
      { input: "nums = [4,5,6,7,0,1,2], target = 3", output: "-1" },
      { input: "nums = [1], target = 0", output: "-1" },
    ],
    constraints: [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4",
      "All values of nums are unique.",
      "-10^4 <= target <= 10^4",
    ],
    starterCode: {
      python:
        "def search(nums: list[int], target: int) -> int:\n    pass",
      javascript:
        "function search(nums, target) {\n    // Your code here\n}",
      java: "class Solution {\n    public int search(int[] nums, int target) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        // Your code here\n    }\n};",
      go: "func search(nums []int, target int) int {\n    // Your code here\n}",
    },
    tags: ["array", "binary-search"],
  },
  {
    id: "medium-011",
    title: "Merge Intervals",
    difficulty: "medium",
    description:
      "Given an array of `intervals` where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
    examples: [
      {
        input: "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        output: "[[1,6],[8,10],[15,18]]",
        explanation:
          "Since intervals [1,3] and [2,6] overlap, merge them into [1,6].",
      },
      {
        input: "intervals = [[1,4],[4,5]]",
        output: "[[1,5]]",
        explanation: "Intervals [1,4] and [4,5] are considered overlapping.",
      },
    ],
    constraints: [
      "1 <= intervals.length <= 10^4",
      "intervals[i].length == 2",
      "0 <= starti <= endi <= 10^4",
    ],
    starterCode: {
      python:
        "def merge(intervals: list[list[int]]) -> list[list[int]]:\n    pass",
      javascript:
        "function merge(intervals) {\n    // Your code here\n}",
      java: "class Solution {\n    public int[][] merge(int[][] intervals) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        // Your code here\n    }\n};",
      go: "func merge(intervals [][]int) [][]int {\n    // Your code here\n}",
    },
    tags: ["array", "sorting"],
  },
  {
    id: "medium-012",
    title: "Word Search",
    difficulty: "medium",
    description:
      "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid.\n\nThe word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.",
    examples: [
      {
        input:
          'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"',
        output: "true",
      },
      {
        input:
          'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"',
        output: "true",
      },
      {
        input:
          'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCB"',
        output: "false",
      },
    ],
    constraints: [
      "m == board.length",
      "n = board[i].length",
      "1 <= m, n <= 6",
      "1 <= word.length <= 15",
      "board and word consists of only lowercase and uppercase English letters.",
    ],
    starterCode: {
      python:
        "def exist(board: list[list[str]], word: str) -> bool:\n    pass",
      javascript:
        "function exist(board, word) {\n    // Your code here\n}",
      java: "class Solution {\n    public boolean exist(char[][] board, String word) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool exist(vector<vector<char>>& board, string word) {\n        // Your code here\n    }\n};",
      go: "func exist(board [][]byte, word string) bool {\n    // Your code here\n}",
    },
    tags: ["array", "backtracking", "matrix"],
  },

  // ─── HARD (8 problems) ─────────────────────

  {
    id: "hard-001",
    title: "Median of Two Sorted Arrays",
    difficulty: "hard",
    description:
      "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).",
    examples: [
      {
        input: "nums1 = [1,3], nums2 = [2]",
        output: "2.00000",
        explanation: "merged array = [1,2,3] and median is 2.",
      },
      {
        input: "nums1 = [1,2], nums2 = [3,4]",
        output: "2.50000",
        explanation:
          "merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.",
      },
    ],
    constraints: [
      "nums1.length == m",
      "nums2.length == n",
      "0 <= m <= 1000",
      "0 <= n <= 1000",
      "1 <= m + n <= 2000",
      "-10^6 <= nums1[i], nums2[i] <= 10^6",
    ],
    starterCode: {
      python:
        "def find_median_sorted_arrays(nums1: list[int], nums2: list[int]) -> float:\n    pass",
      javascript:
        "function findMedianSortedArrays(nums1, nums2) {\n    // Your code here\n}",
      java: "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        // Your code here\n    }\n};",
      go: "func findMedianSortedArrays(nums1 []int, nums2 []int) float64 {\n    // Your code here\n}",
    },
    tags: ["array", "binary-search", "divide-and-conquer"],
  },
  {
    id: "hard-002",
    title: "Trapping Rain Water",
    difficulty: "hard",
    description:
      "Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    examples: [
      {
        input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        output: "6",
        explanation:
          "6 units of rain water are being trapped.",
      },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    constraints: [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5",
    ],
    starterCode: {
      python:
        "def trap(height: list[int]) -> int:\n    pass",
      javascript: "function trap(height) {\n    // Your code here\n}",
      java: "class Solution {\n    public int trap(int[] height) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Your code here\n    }\n};",
      go: "func trap(height []int) int {\n    // Your code here\n}",
    },
    tags: ["array", "two-pointers", "dynamic-programming", "stack"],
  },
  {
    id: "hard-003",
    title: "Serialize and Deserialize Binary Tree",
    difficulty: "hard",
    description:
      "Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.",
    examples: [
      {
        input: "root = [1,2,3,null,null,4,5]",
        output: "[1,2,3,null,null,4,5]",
      },
      { input: "root = []", output: "[]" },
    ],
    constraints: [
      "The number of nodes in the tree is in the range [0, 10^4].",
      "-1000 <= Node.val <= 1000",
    ],
    starterCode: {
      python:
        "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass Codec:\n    def serialize(self, root: TreeNode) -> str:\n        pass\n\n    def deserialize(self, data: str) -> TreeNode:\n        pass",
      javascript:
        "function serialize(root) {\n    // Your code here\n}\n\nfunction deserialize(data) {\n    // Your code here\n}",
      java: "public class Codec {\n    public String serialize(TreeNode root) {\n        // Your code here\n    }\n\n    public TreeNode deserialize(String data) {\n        // Your code here\n    }\n}",
      cpp: "class Codec {\npublic:\n    string serialize(TreeNode* root) {\n        // Your code here\n    }\n\n    TreeNode* deserialize(string data) {\n        // Your code here\n    }\n};",
      go: "type Codec struct{}\n\nfunc Constructor() Codec {\n    return Codec{}\n}\n\nfunc (this *Codec) serialize(root *TreeNode) string {\n    // Your code here\n}\n\nfunc (this *Codec) deserialize(data string) *TreeNode {\n    // Your code here\n}",
    },
    tags: ["string", "tree", "design", "binary-tree"],
  },
  {
    id: "hard-004",
    title: "Merge K Sorted Lists",
    difficulty: "hard",
    description:
      "You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order.\n\nMerge all the linked-lists into one sorted linked-list and return it.",
    examples: [
      {
        input: "lists = [[1,4,5],[1,3,4],[2,6]]",
        output: "[1,1,2,3,4,4,5,6]",
      },
      { input: "lists = []", output: "[]" },
      { input: "lists = [[]]", output: "[]" },
    ],
    constraints: [
      "k == lists.length",
      "0 <= k <= 10^4",
      "0 <= lists[i].length <= 500",
      "-10^4 <= lists[i][j] <= 10^4",
      "lists[i] is sorted in ascending order.",
      "The sum of lists[i].length will not exceed 10^4.",
    ],
    starterCode: {
      python:
        "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef merge_k_lists(lists: list[ListNode]) -> ListNode:\n    pass",
      javascript:
        "function mergeKLists(lists) {\n    // Your code here\n}",
      java: "class Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    ListNode* mergeKLists(vector<ListNode*>& lists) {\n        // Your code here\n    }\n};",
      go: "func mergeKLists(lists []*ListNode) *ListNode {\n    // Your code here\n}",
    },
    tags: ["linked-list", "divide-and-conquer", "heap", "merge-sort"],
  },
  {
    id: "hard-005",
    title: "Minimum Window Substring",
    difficulty: "hard",
    description:
      "Given two strings `s` and `t` of lengths `m` and `n` respectively, return the minimum window substring of `s` such that every character in `t` (including duplicates) is included in the window. If there is no such substring, return the empty string `\"\"`.\n\nThe testcases will be generated such that the answer is unique.",
    examples: [
      {
        input: 's = "ADOBECODEBANC", t = "ABC"',
        output: '"BANC"',
        explanation:
          "The minimum window substring \"BANC\" includes 'A', 'B', and 'C' from string t.",
      },
      { input: 's = "a", t = "a"', output: '"a"' },
      {
        input: 's = "a", t = "aa"',
        output: '""',
        explanation:
          "Both 'a's from t must be included in the window.",
      },
    ],
    constraints: [
      "m == s.length",
      "n == t.length",
      "1 <= m, n <= 10^5",
      "s and t consist of uppercase and lowercase English letters.",
    ],
    starterCode: {
      python:
        "def min_window(s: str, t: str) -> str:\n    pass",
      javascript:
        "function minWindow(s, t) {\n    // Your code here\n}",
      java: "class Solution {\n    public String minWindow(String s, String t) {\n        // Your code here\n    }\n}",
      cpp: "#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    string minWindow(string s, string t) {\n        // Your code here\n    }\n};",
      go: "func minWindow(s string, t string) string {\n    // Your code here\n}",
    },
    tags: ["hash-table", "string", "sliding-window"],
  },
  {
    id: "hard-006",
    title: "Longest Increasing Path in a Matrix",
    difficulty: "hard",
    description:
      "Given an `m x n` integers matrix, return the length of the longest increasing path in the matrix.\n\nFrom each cell, you can either move in four directions: left, right, up, or down. You may not move diagonally or move outside of the boundary.",
    examples: [
      {
        input: "matrix = [[9,9,4],[6,6,8],[2,1,1]]",
        output: "4",
        explanation: "The longest increasing path is [1, 2, 6, 9].",
      },
      {
        input: "matrix = [[3,4,5],[3,2,6],[2,2,1]]",
        output: "4",
        explanation: "The longest increasing path is [3, 4, 5, 6].",
      },
    ],
    constraints: [
      "m == matrix.length",
      "n == matrix[i].length",
      "1 <= m, n <= 200",
      "0 <= matrix[i][j] <= 2^31 - 1",
    ],
    starterCode: {
      python:
        "def longest_increasing_path(matrix: list[list[int]]) -> int:\n    pass",
      javascript:
        "function longestIncreasingPath(matrix) {\n    // Your code here\n}",
      java: "class Solution {\n    public int longestIncreasingPath(int[][] matrix) {\n        // Your code here\n    }\n}",
      cpp: "#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int longestIncreasingPath(vector<vector<int>>& matrix) {\n        // Your code here\n    }\n};",
      go: "func longestIncreasingPath(matrix [][]int) int {\n    // Your code here\n}",
    },
    tags: [
      "array",
      "dynamic-programming",
      "depth-first-search",
      "memoization",
      "matrix",
    ],
  },
  {
    id: "hard-007",
    title: "Word Ladder",
    difficulty: "hard",
    description:
      'A transformation sequence from word `beginWord` to word `endWord` using a dictionary `wordList` is a sequence of words `beginWord -> s1 -> s2 -> ... -> sk` such that:\n\n- Every adjacent pair of words differs by a single letter.\n- Every `si` for `1 <= i <= k` is in `wordList`. Note that `beginWord` does not need to be in `wordList`.\n- `sk == endWord`\n\nGiven two words, `beginWord` and `endWord`, and a dictionary `wordList`, return the number of words in the shortest transformation sequence from `beginWord` to `endWord`, or `0` if no such sequence exists.',
    examples: [
      {
        input:
          'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
        output: "5",
        explanation:
          'One shortest transformation sequence is "hit" -> "hot" -> "dot" -> "dog" -> "cog", which is 5 words long.',
      },
      {
        input:
          'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]',
        output: "0",
        explanation:
          "The endWord \"cog\" is not in wordList, therefore there is no valid transformation sequence.",
      },
    ],
    constraints: [
      "1 <= beginWord.length <= 10",
      "endWord.length == beginWord.length",
      "1 <= wordList.length <= 5000",
      "wordList[i].length == beginWord.length",
      "beginWord, endWord, and wordList[i] consist of lowercase English letters.",
      "beginWord != endWord",
      "All the words in wordList are unique.",
    ],
    starterCode: {
      python:
        "def ladder_length(begin_word: str, end_word: str, word_list: list[str]) -> int:\n    pass",
      javascript:
        "function ladderLength(beginWord, endWord, wordList) {\n    // Your code here\n}",
      java: "class Solution {\n    public int ladderLength(String beginWord, String endWord, List<String> wordList) {\n        // Your code here\n    }\n}",
      cpp: "#include <string>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int ladderLength(string beginWord, string endWord, vector<string>& wordList) {\n        // Your code here\n    }\n};",
      go: "func ladderLength(beginWord string, endWord string, wordList []string) int {\n    // Your code here\n}",
    },
    tags: ["hash-table", "string", "breadth-first-search"],
  },
  {
    id: "hard-008",
    title: "Regular Expression Matching",
    difficulty: "hard",
    description:
      "Given an input string `s` and a pattern `p`, implement regular expression matching with support for `.` and `*` where:\n\n- `.` Matches any single character.\n- `*` Matches zero or more of the preceding element.\n\nThe matching should cover the entire input string (not partial).",
    examples: [
      {
        input: 's = "aa", p = "a"',
        output: "false",
        explanation: '"a" does not match the entire string "aa".',
      },
      {
        input: 's = "aa", p = "a*"',
        output: "true",
        explanation:
          "'*' means zero or more of the preceding element, 'a'. Therefore, by repeating 'a' once, it becomes \"aa\".",
      },
      {
        input: 's = "ab", p = ".*"',
        output: "true",
        explanation: '".*" means "zero or more (*) of any character (.)".',
      },
    ],
    constraints: [
      "1 <= s.length <= 20",
      "1 <= p.length <= 20",
      "s contains only lowercase English letters.",
      "p contains only lowercase English letters, '.', and '*'.",
      "It is guaranteed for each appearance of the character '*', there will be a previous valid character to match.",
    ],
    starterCode: {
      python:
        "def is_match(s: str, p: str) -> bool:\n    pass",
      javascript:
        "function isMatch(s, p) {\n    // Your code here\n}",
      java: "class Solution {\n    public boolean isMatch(String s, String p) {\n        // Your code here\n    }\n}",
      cpp: "#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isMatch(string s, string p) {\n        // Your code here\n    }\n};",
      go: "func isMatch(s string, p string) bool {\n    // Your code here\n}",
    },
    tags: ["string", "dynamic-programming", "recursion"],
  },
];
