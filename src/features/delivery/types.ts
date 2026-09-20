export type {
  DeliveryMethod,
  CollegeType,
} from '../../types';

export interface CampusDeliveryInfo {
  department?: string;
  year?: string;
  section?: string;
  building_block?: string;
  pickup_location?: string;
}

export interface HomeDeliveryInfo {
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
}
