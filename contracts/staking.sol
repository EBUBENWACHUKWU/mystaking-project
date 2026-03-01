// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract Staking is Ownable, ReentrancyGuard, Pausable {

    mapping(address => uint256) public balances;
    mapping(address => uint256) public lastUpdate;

    uint256 public totalStaked;

    uint256 public constant APR = 10;
    uint256 public constant SECONDS_IN_YEAR = 365 days;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);

    function calculateRewards(address user) public view returns (uint256) {
        if (balances[user] == 0) {
            return 0;
        }

        uint256 timeStaked = block.timestamp - lastUpdate[user];

        return (balances[user] * APR * timeStaked)
            / (100 * SECONDS_IN_YEAR);
    }

    function stake() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Cannot stake 0 ETH");

        if (balances[msg.sender] > 0) {
            uint256 reward = calculateRewards(msg.sender);
            balances[msg.sender] += reward;
        }

        balances[msg.sender] += msg.value;
        totalStaked += msg.value;

        lastUpdate[msg.sender] = block.timestamp;

        emit Staked(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot withdraw 0");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        uint256 reward = calculateRewards(msg.sender);

        balances[msg.sender] = balances[msg.sender] + reward - amount;
        totalStaked -= amount;

        lastUpdate[msg.sender] = block.timestamp;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        uint256 reward = calculateRewards(msg.sender);
        require(reward > 0, "No rewards available");

        lastUpdate[msg.sender] = block.timestamp;

        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Transfer failed");

        emit RewardsClaimed(msg.sender, reward);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    function getPendingRewards(address user) external view returns (uint256) {
        return calculateRewards(user);
    }
}