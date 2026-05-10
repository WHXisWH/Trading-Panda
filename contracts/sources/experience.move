/// Experience level + Walrus blob_id — on-chain milestones.
/// Doc ref: docs/contract-design.md §experience
module trading_panda::experience {
    use sui::dynamic_field;
    use sui::object::UID;
    use sui::event;
    use std::string::String;

    public struct ExperienceData has store, drop {
        level: u8,           // 0–100
        walrus_blob_id: String,
        last_synced_at: u64,
    }

    public struct MilestoneEvent has copy, drop {
        panda_id: address,
        milestone_level: u8,
        timestamp: u64,
    }

    const KEY: vector<u8> = b"experience";
    const MILESTONES: vector<u8> = vector[25, 50, 65, 80, 100];

    public fun update_experience(
        panda_id: &mut UID,
        panda_addr: address,
        new_level: u8,
        blob_id: String,
        timestamp: u64,
    ) {
        let data = ExperienceData { level: new_level, walrus_blob_id: blob_id, last_synced_at: timestamp };
        if (dynamic_field::exists(panda_id, KEY)) {
            *dynamic_field::borrow_mut(panda_id, KEY) = data;
        } else {
            dynamic_field::add(panda_id, KEY, data);
        };
        // Emit milestone event at thresholds
        if (is_milestone(new_level)) {
            event::emit(MilestoneEvent { panda_id: panda_addr, milestone_level: new_level, timestamp });
        }
    }

    fun is_milestone(level: u8): bool {
        level == 25 || level == 50 || level == 65 || level == 80 || level == 100
    }
}
