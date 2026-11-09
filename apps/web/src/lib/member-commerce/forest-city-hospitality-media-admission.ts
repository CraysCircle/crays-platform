import "server-only";

import type {
  ForestCityAdmittedMedia,
  ForestCityContentPropertyId,
} from "./forest-city-hospitality-content-contract";

export const FOREST_CITY_HOSPITALITY_MEDIA_LICENSE_RECEIPTS = {
  officialHotel: {
    licenseReceiptId: "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
    basis: "owner_authorized_official_hotel_marketing_media",
  },
  booking: {
    licenseReceiptId:
      "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
    basis: "owner_confirmed_written_booking_com_partner_media_rights",
    scope:
      "property photos under /xdata/images/hotel/ only; no traveler, review, profile or UGC media",
  },
} as const;

export const FOREST_CITY_HOSPITALITY_MEDIA_COVERAGE = {
  complete: false,
  state: "partial_due_golf_booking_gallery_waf",
  golf: {
    officialWebsiteObservedCrawlComplete: true,
    bookingGalleryComplete: false,
    blocker:
      "Booking property page returned AWS-WAF HTTP 202; 13 property-photo IDs admitted from cached locale property renders.",
  },
  marina: {
    officialWebsiteObservedCrawlComplete: true,
    bookingPropertyPageObservedCrawlComplete: true,
    blocker: null,
  },
} as const;

const admitted = {
  "property-clubs-forest-city-golf": [
    {
      id: "golf-gallery-001-62d864b37e84",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-303201344",
      sourceAssetId: "303201344",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/303201344.jpg?k=4cd6aa179017d7700c0f14584c385b2137c9e55e031fe156b6cf8cc55b68e2a8&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/303201344.jpg?k=4cd6aa179017d7700c0f14584c385b2137c9e55e031fe156b6cf8cc55b68e2a8&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/001-62d864b37e846ab0.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/001-62d864b37e846ab0.jpg",
      originalSha256:
        "62d864b37e846ab0d5848f19b0d6e6aac619ae4edc1deeff30f9cafc795a8050",
      servedAssetSha256:
        "62d864b37e846ab0d5848f19b0d6e6aac619ae4edc1deeff30f9cafc795a8050",
      mediaType: "image/jpeg",
      width: 1024,
      height: 683,
      placement: "detail_gallery_primary",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 1,
      detailGalleryOrder: 1,
      alt: "Forest City Golf Hotel featured view",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-002-083a5d47c48e",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-083a5d47c48edf6e",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/sld-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/sld-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/002-083a5d47c48edf6e.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/002-083a5d47c48edf6e.jpg",
      originalSha256:
        "083a5d47c48edf6e9002111e531b0adf7d39fc3458d9adba51241645ec572fad",
      servedAssetSha256:
        "083a5d47c48edf6e9002111e531b0adf7d39fc3458d9adba51241645ec572fad",
      mediaType: "image/jpeg",
      width: 1920,
      height: 650,
      placement: "collection",
      searchPlacement: "collection",
      galleryGroup: "Golf & Beach",
      galleryOrder: 2,
      detailGalleryOrder: 2,
      alt: "Forest City Golf Hotel and golf resort",
      focalPoint: {
        x: 0.62,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-003-ef05a7097ce8",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-303202078",
      sourceAssetId: "303202078",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/303202078.jpg?k=3076cdd2a0cfcd16b019b0b29281098f1651fbdee1394d1bcace63b807e6148e&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/303202078.jpg?k=3076cdd2a0cfcd16b019b0b29281098f1651fbdee1394d1bcace63b807e6148e&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/003-ef05a7097ce8d58a.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/003-ef05a7097ce8d58a.jpg",
      originalSha256:
        "ef05a7097ce8d58acdb13cc49ff7f8cd619e9baf28bdc416e0928952b69d3a39",
      servedAssetSha256:
        "ef05a7097ce8d58acdb13cc49ff7f8cd619e9baf28bdc416e0928952b69d3a39",
      mediaType: "image/jpeg",
      width: 1024,
      height: 768,
      placement: "promo",
      searchPlacement: "promo",
      galleryGroup: "Property gallery",
      galleryOrder: 3,
      detailGalleryOrder: 3,
      alt: "Forest City Golf Hotel pool and golf landscape",
      focalPoint: {
        x: 0.5,
        y: 0.55,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-004-f9f3773022d4",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-307148786",
      sourceAssetId: "307148786",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307148786.jpg?k=5787d9bc327a737e2a871bb8ea2be93965863bff1c58468d710573ec787b1ce1&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307148786.jpg?k=5787d9bc327a737e2a871bb8ea2be93965863bff1c58468d710573ec787b1ce1&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/004-f9f3773022d48f71.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/004-f9f3773022d48f71.jpg",
      originalSha256:
        "f9f3773022d48f71949d33393513c52ea6798a604b11cb705e912a073fdfc5fd",
      servedAssetSha256:
        "f9f3773022d48f71949d33393513c52ea6798a604b11cb705e912a073fdfc5fd",
      mediaType: "image/jpeg",
      width: 1024,
      height: 768,
      placement: "search_card_primary",
      searchPlacement: "search_card_primary",
      galleryGroup: "Property gallery",
      galleryOrder: 4,
      detailGalleryOrder: 4,
      alt: "Forest City Golf Hotel exterior",
      focalPoint: {
        x: 0.5,
        y: 0.48,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-005-af79d00a220a",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-307168718",
      sourceAssetId: "307168718",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307168718.jpg?k=30edf3cb5b47471a481246d6cec2c137c5d9275fbc54efc3046fd29926d518e9&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307168718.jpg?k=30edf3cb5b47471a481246d6cec2c137c5d9275fbc54efc3046fd29926d518e9&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/005-af79d00a220afee7.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/005-af79d00a220afee7.jpg",
      originalSha256:
        "af79d00a220afee78bb951cd454d0a7aaa5a3aa9ab029efa36bb2d9f1d8b85ff",
      servedAssetSha256:
        "af79d00a220afee78bb951cd454d0a7aaa5a3aa9ab029efa36bb2d9f1d8b85ff",
      mediaType: "image/jpeg",
      width: 1024,
      height: 683,
      placement: "editorial",
      searchPlacement: "editorial",
      galleryGroup: "Property gallery",
      galleryOrder: 5,
      detailGalleryOrder: 5,
      alt: "Forest City Golf Hotel event setting",
      focalPoint: {
        x: 0.48,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-006-8aeac555e793",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-8aeac555e79344ac",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-King-Room.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-King-Room.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/006-8aeac555e79344ac.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/006-8aeac555e79344ac.jpg",
      originalSha256:
        "8aeac555e79344ac53f601934a676dc3f88154f9af4da3ac569df48c6b2a2b64",
      servedAssetSha256:
        "8aeac555e79344ac53f601934a676dc3f88154f9af4da3ac569df48c6b2a2b64",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 6,
      detailGalleryOrder: 6,
      alt: "Forest City Golf Hotel rooms & suites image 6",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-007-ab4b465a6494",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-ab4b465a64946709",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-Suite-Room.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-Suite-Room.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/007-ab4b465a64946709.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/007-ab4b465a64946709.jpg",
      originalSha256:
        "ab4b465a649467093c7054dde5180022d6b998ad41e6dd48645a350ea24dd500",
      servedAssetSha256:
        "ab4b465a649467093c7054dde5180022d6b998ad41e6dd48645a350ea24dd500",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 7,
      detailGalleryOrder: 7,
      alt: "Forest City Golf Hotel rooms & suites image 7",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-008-48680f72c725",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-48680f72c725e705",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-Twin-Room.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/Superior-Deluxe-Twin-Room.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/008-48680f72c725e705.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/008-48680f72c725e705.jpg",
      originalSha256:
        "48680f72c725e705eede5aee9b129c8c284a05b62d1594ebd48b865208b416f2",
      servedAssetSha256:
        "48680f72c725e705eede5aee9b129c8c284a05b62d1594ebd48b865208b416f2",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 8,
      detailGalleryOrder: 8,
      alt: "Forest City Golf Hotel rooms & suites image 8",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-009-fef36d65e405",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-fef36d65e405dcb5",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/2019/01/11/family-suite20190111.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/2019/01/11/family-suite20190111.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/009-fef36d65e405dcb5.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/009-fef36d65e405dcb5.jpg",
      originalSha256:
        "fef36d65e405dcb5108fa24539e06b852446f870ea8825fa74d05e59b21136a0",
      servedAssetSha256:
        "fef36d65e405dcb5108fa24539e06b852446f870ea8825fa74d05e59b21136a0",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 9,
      detailGalleryOrder: 9,
      alt: "Forest City Golf Hotel rooms & suites image 9",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-010-07d54fe9e897",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-07d54fe9e8973d5f",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/010-07d54fe9e8973d5f.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/010-07d54fe9e8973d5f.jpg",
      originalSha256:
        "07d54fe9e8973d5fbdd8b4c8e9c8fc8b69799ebd86c2c320918a6d1f628a293d",
      servedAssetSha256:
        "07d54fe9e8973d5fbdd8b4c8e9c8fc8b69799ebd86c2c320918a6d1f628a293d",
      mediaType: "image/jpeg",
      width: 1200,
      height: 900,
      placement: "gallery_supporting",
      searchPlacement: "editorial_clear_stay_information",
      galleryGroup: "Dining",
      galleryOrder: 10,
      detailGalleryOrder: 10,
      alt: "Dining room at Forest City Golf Hotel",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-011-29dd869274df",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-29dd869274df71eb",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-002-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-002-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/011-29dd869274df71eb.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/011-29dd869274df71eb.jpg",
      originalSha256:
        "29dd869274df71eb39fab7ecf3aa924e246bec86831820d5841a244257267adb",
      servedAssetSha256:
        "29dd869274df71eb39fab7ecf3aa924e246bec86831820d5841a244257267adb",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 11,
      detailGalleryOrder: 11,
      alt: "Forest City Golf Hotel dining image 11",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-012-f0a99eab7058",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-f0a99eab705847b4",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-003-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-003-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/012-f0a99eab705847b4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/012-f0a99eab705847b4.jpg",
      originalSha256:
        "f0a99eab705847b419227a32432e23f7b4522cf9a215e512bbe063266023822d",
      servedAssetSha256:
        "f0a99eab705847b419227a32432e23f7b4522cf9a215e512bbe063266023822d",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 12,
      detailGalleryOrder: 12,
      alt: "Forest City Golf Hotel dining image 12",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-013-c1c62a1ccc9b",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-c1c62a1ccc9b71c6",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-bg-002-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/dining/rd-bg-002-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/013-c1c62a1ccc9b71c6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/013-c1c62a1ccc9b71c6.jpg",
      originalSha256:
        "c1c62a1ccc9b71c69ab1d4998917f27a612f5c7397f82bdd8b586af1f296d2fe",
      servedAssetSha256:
        "c1c62a1ccc9b71c69ab1d4998917f27a612f5c7397f82bdd8b586af1f296d2fe",
      mediaType: "image/jpeg",
      width: 1920,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 13,
      detailGalleryOrder: 13,
      alt: "Forest City Golf Hotel dining image 13",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-014-b3fdb79d63a0",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-b3fdb79d63a0f7f2",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/about/abt-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/about/abt-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/014-b3fdb79d63a0f7f2.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/014-b3fdb79d63a0f7f2.jpg",
      originalSha256:
        "b3fdb79d63a0f7f2bad8467ab99fb4b65086ceacf2fb48a43e3a6d3aea4d21be",
      servedAssetSha256:
        "b3fdb79d63a0f7f2bad8467ab99fb4b65086ceacf2fb48a43e3a6d3aea4d21be",
      mediaType: "image/jpeg",
      width: 1200,
      height: 900,
      placement: "gallery_supporting",
      searchPlacement: "promo_forest_city_properties",
      galleryGroup: "Golf & Beach",
      galleryOrder: 14,
      detailGalleryOrder: 14,
      alt: "Forest City Golf Hotel exterior, room and dining setting",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-015-bcfc1bee384c",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-bcfc1bee384cf1f3",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/about/abt-bg-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/about/abt-bg-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/015-bcfc1bee384cf1f3.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/015-bcfc1bee384cf1f3.jpg",
      originalSha256:
        "bcfc1bee384cf1f3c983d9dc853032a720d49f5b1b91664da0808ce43463d64b",
      servedAssetSha256:
        "bcfc1bee384cf1f3c983d9dc853032a720d49f5b1b91664da0808ce43463d64b",
      mediaType: "image/jpeg",
      width: 1920,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 15,
      detailGalleryOrder: 15,
      alt: "Forest City Golf Hotel golf & beach image 15",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-016-8f58e01d73ce",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-8f58e01d73ce5273",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/banner/ban-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/banner/ban-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/016-8f58e01d73ce5273.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/016-8f58e01d73ce5273.jpg",
      originalSha256:
        "8f58e01d73ce527397c94a23d04654a284304606008d965f755ed080e0677b7c",
      servedAssetSha256:
        "8f58e01d73ce527397c94a23d04654a284304606008d965f755ed080e0677b7c",
      mediaType: "image/jpeg",
      width: 1920,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 16,
      detailGalleryOrder: 16,
      alt: "Forest City Golf Hotel golf & beach image 16",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-017-69fab93d3587",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-69fab93d3587dba1",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/017-69fab93d3587dba1.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/017-69fab93d3587dba1.jpg",
      originalSha256:
        "69fab93d3587dba16ba7762bed21a54a4e49c2a0f84b5b9db2e157155f9d8497",
      servedAssetSha256:
        "69fab93d3587dba16ba7762bed21a54a4e49c2a0f84b5b9db2e157155f9d8497",
      mediaType: "image/jpeg",
      width: 1200,
      height: 900,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 17,
      detailGalleryOrder: 17,
      alt: "Forest City Golf Hotel golf & beach image 17",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-018-a150a38b726e",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-a150a38b726e8953",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-002-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-002-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/018-a150a38b726e8953.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/018-a150a38b726e8953.jpg",
      originalSha256:
        "a150a38b726e8953e501e0e921157f3903bd49270c0c22a9d6357e56714fdd11",
      servedAssetSha256:
        "a150a38b726e8953e501e0e921157f3903bd49270c0c22a9d6357e56714fdd11",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 18,
      detailGalleryOrder: 18,
      alt: "Forest City Golf Hotel golf & beach image 18",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-019-19ead27095bf",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-19ead27095bf7b85",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-003-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-003-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/019-19ead27095bf7b85.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/019-19ead27095bf7b85.jpg",
      originalSha256:
        "19ead27095bf7b859bf17872163f06423c74d77093ac6ea3b0b174b6c595b876",
      servedAssetSha256:
        "19ead27095bf7b859bf17872163f06423c74d77093ac6ea3b0b174b6c595b876",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 19,
      detailGalleryOrder: 19,
      alt: "Forest City Golf Hotel golf & beach image 19",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-020-7b28febdd7b7",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-7b28febdd7b77b4e",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-004-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-004-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/020-7b28febdd7b77b4e.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/020-7b28febdd7b77b4e.jpg",
      originalSha256:
        "7b28febdd7b77b4ed1d2009ad2241277c939c04890df68988a790e8d79ea0467",
      servedAssetSha256:
        "7b28febdd7b77b4ed1d2009ad2241277c939c04890df68988a790e8d79ea0467",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 20,
      detailGalleryOrder: 20,
      alt: "Forest City Golf Hotel golf & beach image 20",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-021-773845c2b044",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-773845c2b0441598",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-005-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-005-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/021-773845c2b0441598.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/021-773845c2b0441598.jpg",
      originalSha256:
        "773845c2b044159815d0b3325690673c61dfc77ed4640821e336d3306778dba1",
      servedAssetSha256:
        "773845c2b044159815d0b3325690673c61dfc77ed4640821e336d3306778dba1",
      mediaType: "image/jpeg",
      width: 600,
      height: 400,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 21,
      detailGalleryOrder: 21,
      alt: "Forest City Golf Hotel golf & beach image 21",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-022-89fc11d22bce",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-89fc11d22bcec2d4",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-bg-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/golf/golf-bg-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/022-89fc11d22bcec2d4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/022-89fc11d22bcec2d4.jpg",
      originalSha256:
        "89fc11d22bcec2d4156f97f2256cdc80e66a012244ad6a55751e803f984c814c",
      servedAssetSha256:
        "89fc11d22bcec2d4156f97f2256cdc80e66a012244ad6a55751e803f984c814c",
      mediaType: "image/jpeg",
      width: 1920,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 22,
      detailGalleryOrder: 22,
      alt: "Forest City Golf Hotel golf & beach image 22",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-023-e53ab4f36f8c",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-e53ab4f36f8c5fd1",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/health/hr-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/health/hr-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/023-e53ab4f36f8c5fd1.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/023-e53ab4f36f8c5fd1.jpg",
      originalSha256:
        "e53ab4f36f8c5fd11deb29dac385d5f1e7a696dac3d2fd78cc4b332352800547",
      servedAssetSha256:
        "e53ab4f36f8c5fd11deb29dac385d5f1e7a696dac3d2fd78cc4b332352800547",
      mediaType: "image/jpeg",
      width: 1200,
      height: 900,
      placement: "gallery_supporting",
      searchPlacement: "collection_public_hotel_stays",
      galleryGroup: "Golf & Beach",
      galleryOrder: 23,
      detailGalleryOrder: 23,
      alt: "Pool and fitness facilities at Forest City Golf Hotel",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-024-2d153fe3000f",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-2d153fe3000f9b16",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/health/hr-bg-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/health/hr-bg-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/024-2d153fe3000f9b16.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/024-2d153fe3000f9b16.jpg",
      originalSha256:
        "2d153fe3000f9b16ce2ce1a8febd10be66ff6e16ffd803736adc53802e691f63",
      servedAssetSha256:
        "2d153fe3000f9b16ce2ce1a8febd10be66ff6e16ffd803736adc53802e691f63",
      mediaType: "image/jpeg",
      width: 1920,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 24,
      detailGalleryOrder: 24,
      alt: "Forest City Golf Hotel golf & beach image 24",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-025-c3cf184f2d0a",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-c3cf184f2d0abcb0",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/025-c3cf184f2d0abcb0.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/025-c3cf184f2d0abcb0.jpg",
      originalSha256:
        "c3cf184f2d0abcb05cfa31c3f0d3ba6da53fd1dbf1bb735141136a7954c4f2b1",
      servedAssetSha256:
        "c3cf184f2d0abcb05cfa31c3f0d3ba6da53fd1dbf1bb735141136a7954c4f2b1",
      mediaType: "image/jpeg",
      width: 500,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 25,
      detailGalleryOrder: 25,
      alt: "Forest City Golf Hotel golf & beach image 25",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-026-06146b29b12d",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-06146b29b12d87c8",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-002-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-002-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/026-06146b29b12d87c8.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/026-06146b29b12d87c8.jpg",
      originalSha256:
        "06146b29b12d87c8e1f18cc2bf0f660f58703ba0a89d29592cc2759467163282",
      servedAssetSha256:
        "06146b29b12d87c8e1f18cc2bf0f660f58703ba0a89d29592cc2759467163282",
      mediaType: "image/jpeg",
      width: 500,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 26,
      detailGalleryOrder: 26,
      alt: "Forest City Golf Hotel golf & beach image 26",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-027-25a9b43a3dc7",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-25a9b43a3dc74438",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-003-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-003-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/027-25a9b43a3dc74438.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/027-25a9b43a3dc74438.jpg",
      originalSha256:
        "25a9b43a3dc74438039f50ff5a0bb473e2d2226554bd266a3e67fa120e907600",
      servedAssetSha256:
        "25a9b43a3dc74438039f50ff5a0bb473e2d2226554bd266a3e67fa120e907600",
      mediaType: "image/jpeg",
      width: 500,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 27,
      detailGalleryOrder: 27,
      alt: "Forest City Golf Hotel golf & beach image 27",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-028-01ac4ee33f68",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-01ac4ee33f6897d8",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-004-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-004-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/028-01ac4ee33f6897d8.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/028-01ac4ee33f6897d8.jpg",
      originalSha256:
        "01ac4ee33f6897d82d90f486b30ee9ef17e32aad634ddc9db5b30ed4f55a7e8e",
      servedAssetSha256:
        "01ac4ee33f6897d82d90f486b30ee9ef17e32aad634ddc9db5b30ed4f55a7e8e",
      mediaType: "image/jpeg",
      width: 500,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 28,
      detailGalleryOrder: 28,
      alt: "Forest City Golf Hotel golf & beach image 28",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-029-149805f08ae6",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-149805f08ae6a37c",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-bg-001.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-bg-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/029-149805f08ae6a37c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/029-149805f08ae6a37c.jpg",
      originalSha256:
        "149805f08ae6a37cbad51e6f39b42ff295df2e35ad933101a2d8ca8181c1907f",
      servedAssetSha256:
        "149805f08ae6a37cbad51e6f39b42ff295df2e35ad933101a2d8ca8181c1907f",
      mediaType: "image/jpeg",
      width: 1920,
      height: 800,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 29,
      detailGalleryOrder: 29,
      alt: "Forest City Golf Hotel golf & beach image 29",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-030-9816b3edea05",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-9816b3edea058981",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-bg-002.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/hm-bg-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/030-9816b3edea058981.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/030-9816b3edea058981.jpg",
      originalSha256:
        "9816b3edea058981ea4fe2c809138001b92ec94f6e4230d398944af36c338885",
      servedAssetSha256:
        "9816b3edea058981ea4fe2c809138001b92ec94f6e4230d398944af36c338885",
      mediaType: "image/jpeg",
      width: 1920,
      height: 800,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 30,
      detailGalleryOrder: 30,
      alt: "Forest City Golf Hotel golf & beach image 30",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-031-4398bd2acc10",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-4398bd2acc10c68e",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/sld-002-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/sld-002-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/031-4398bd2acc10c68e.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/031-4398bd2acc10c68e.jpg",
      originalSha256:
        "4398bd2acc10c68e1308768562f4858a01fc2377711a193e5468a12271c43829",
      servedAssetSha256:
        "4398bd2acc10c68e1308768562f4858a01fc2377711a193e5468a12271c43829",
      mediaType: "image/jpeg",
      width: 1920,
      height: 650,
      placement: "gallery_supporting",
      searchPlacement: "destination_golf_hotel",
      galleryGroup: "Golf & Beach",
      galleryOrder: 31,
      detailGalleryOrder: 31,
      alt: "Forest City Golf Hotel beside the golf course",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-032-6f396e2a1347",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-6f396e2a1347f0d1",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/sld-003-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/home/sld-003-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/032-6f396e2a1347f0d1.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/032-6f396e2a1347f0d1.jpg",
      originalSha256:
        "6f396e2a1347f0d1f3e361ad189e2659a68f8c4b0e82bccead8a02909712711e",
      servedAssetSha256:
        "6f396e2a1347f0d1f3e361ad189e2659a68f8c4b0e82bccead8a02909712711e",
      mediaType: "image/jpeg",
      width: 1920,
      height: 650,
      placement: "gallery_supporting",
      searchPlacement: "destination_legacy_golf_course",
      galleryGroup: "Golf & Beach",
      galleryOrder: 32,
      detailGalleryOrder: 32,
      alt: "Forest City golf course landscape",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-033-be3ad1d2ee71",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-be3ad1d2ee71ca44",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/conference/cv-001-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/conference/cv-001-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/033-be3ad1d2ee71ca44.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/033-be3ad1d2ee71ca44.jpg",
      originalSha256:
        "be3ad1d2ee71ca445190a99cf33392c329cbd618c0ef2d3bff7b2398445b393f",
      servedAssetSha256:
        "be3ad1d2ee71ca445190a99cf33392c329cbd618c0ef2d3bff7b2398445b393f",
      mediaType: "image/jpeg",
      width: 1200,
      height: 900,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 33,
      detailGalleryOrder: 33,
      alt: "Forest City Golf Hotel meetings & events image 33",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-034-d04a8023a605",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "forest_city_golf_hotel_official",
      sourceEvidenceId: "official-hotel-asset-d04a8023a605d9fd",
      sourceAssetId: null,
      sourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/conference/cv-bg-002-min.jpg",
      finalSourceUrl:
        "https://fcgolfhotel.com/images/1_Golf-hotel/conference/cv-bg-002-min.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/034-d04a8023a605d9fd.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/034-d04a8023a605d9fd.jpg",
      originalSha256:
        "d04a8023a605d9fd9c534faaf4886b1112704f805e4b7344090dc9cc7f5f4d56",
      servedAssetSha256:
        "d04a8023a605d9fd9c534faaf4886b1112704f805e4b7344090dc9cc7f5f4d56",
      mediaType: "image/jpeg",
      width: 1920,
      height: 600,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 34,
      detailGalleryOrder: 34,
      alt: "Forest City Golf Hotel meetings & events image 34",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-035-eb03e7049681",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-303202537",
      sourceAssetId: "303202537",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/303202537.jpg?k=6aa4e8be22b6b3fe8fbffa4999b912c13342e0e00ef867c58b0107a0e053d3c3&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/303202537.jpg?k=6aa4e8be22b6b3fe8fbffa4999b912c13342e0e00ef867c58b0107a0e053d3c3&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/035-eb03e7049681766c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/035-eb03e7049681766c.jpg",
      originalSha256:
        "eb03e7049681766cdfcf5977bedcff5d7f1471536e3c0142110c38488d57dabb",
      servedAssetSha256:
        "eb03e7049681766cdfcf5977bedcff5d7f1471536e3c0142110c38488d57dabb",
      mediaType: "image/jpeg",
      width: 1024,
      height: 646,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 35,
      detailGalleryOrder: 35,
      alt: "Forest City Golf Hotel property gallery image 35",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-036-00f832f9c523",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-303218359",
      sourceAssetId: "303218359",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/303218359.jpg?k=e2221aa2973d555c5eb0349166bd2c05626860843256092927a85d25cdcffa2b&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/303218359.jpg?k=e2221aa2973d555c5eb0349166bd2c05626860843256092927a85d25cdcffa2b&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/036-00f832f9c5237513.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/036-00f832f9c5237513.jpg",
      originalSha256:
        "00f832f9c5237513f1452fd0c81a1ede26e7827f27a017670e80447be18e4598",
      servedAssetSha256:
        "00f832f9c5237513f1452fd0c81a1ede26e7827f27a017670e80447be18e4598",
      mediaType: "image/jpeg",
      width: 1024,
      height: 648,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 36,
      detailGalleryOrder: 36,
      alt: "Forest City Golf Hotel property gallery image 36",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-037-463ae0caaaba",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-307133251",
      sourceAssetId: "307133251",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307133251.jpg?k=83c7f9ba3c606ecfb40f9f5b7e66bed59817869c1036ede2c9b0f80df0b4a6db&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307133251.jpg?k=83c7f9ba3c606ecfb40f9f5b7e66bed59817869c1036ede2c9b0f80df0b4a6db&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/037-463ae0caaaba84bf.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/037-463ae0caaaba84bf.jpg",
      originalSha256:
        "463ae0caaaba84bf9af4bd35509e1d59d56ab7275975dfb5265052feb70de944",
      servedAssetSha256:
        "463ae0caaaba84bf9af4bd35509e1d59d56ab7275975dfb5265052feb70de944",
      mediaType: "image/jpeg",
      width: 1024,
      height: 683,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 37,
      detailGalleryOrder: 37,
      alt: "Forest City Golf Hotel property gallery image 37",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-038-e4a3a277ca91",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-307135164",
      sourceAssetId: "307135164",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307135164.jpg?k=ad4be21e9937e92c32ce0aea1571adb9ce39062a2bc0174974ef592f42a36ca8&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307135164.jpg?k=ad4be21e9937e92c32ce0aea1571adb9ce39062a2bc0174974ef592f42a36ca8&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/038-e4a3a277ca91bd97.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/038-e4a3a277ca91bd97.jpg",
      originalSha256:
        "e4a3a277ca91bd97e1f768288b983305df8362381b1fbfc9eedc67c97738b3e1",
      servedAssetSha256:
        "e4a3a277ca91bd97e1f768288b983305df8362381b1fbfc9eedc67c97738b3e1",
      mediaType: "image/jpeg",
      width: 1024,
      height: 472,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 38,
      detailGalleryOrder: 38,
      alt: "Forest City Golf Hotel property gallery image 38",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-039-bb20fddfbc9b",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-307148783",
      sourceAssetId: "307148783",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307148783.jpg?k=7a52acebfa710ef9c57ff1420678c43d813217f070c6653594ecb687b5ab38ab&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/307148783.jpg?k=7a52acebfa710ef9c57ff1420678c43d813217f070c6653594ecb687b5ab38ab&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/039-bb20fddfbc9b96dd.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/039-bb20fddfbc9b96dd.jpg",
      originalSha256:
        "bb20fddfbc9b96dd0a2b92fbebb73e354e919d8ebcd13eaeaad1a975e4fb8701",
      servedAssetSha256:
        "bb20fddfbc9b96dd0a2b92fbebb73e354e919d8ebcd13eaeaad1a975e4fb8701",
      mediaType: "image/jpeg",
      width: 1024,
      height: 683,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 39,
      detailGalleryOrder: 39,
      alt: "Forest City Golf Hotel property gallery image 39",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-040-46e9c2279451",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-309545720",
      sourceAssetId: "309545720",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/309545720.jpg?k=5c968f9afe0493c38c24cadec693caf66bbf87edfd9f97a5d3e8cd0997758ef5&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/309545720.jpg?k=5c968f9afe0493c38c24cadec693caf66bbf87edfd9f97a5d3e8cd0997758ef5&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/040-46e9c2279451153a.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/040-46e9c2279451153a.jpg",
      originalSha256:
        "46e9c2279451153acc51389648a60cda022135b7c6418d666690db19bd295a97",
      servedAssetSha256:
        "46e9c2279451153acc51389648a60cda022135b7c6418d666690db19bd295a97",
      mediaType: "image/jpeg",
      width: 616,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 40,
      detailGalleryOrder: 40,
      alt: "Forest City Golf Hotel property gallery image 40",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-041-08b5802aee64",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-309545722",
      sourceAssetId: "309545722",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/309545722.jpg?k=ee03290aee45a73500ce474c0836ab25eb8d43bc0082ead12f8579ae69706f76&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/309545722.jpg?k=ee03290aee45a73500ce474c0836ab25eb8d43bc0082ead12f8579ae69706f76&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/041-08b5802aee645fa6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/041-08b5802aee645fa6.jpg",
      originalSha256:
        "08b5802aee645fa6f4887610ed491680af1b00f65c19f59054592ee0cce2b0f2",
      servedAssetSha256:
        "08b5802aee645fa6f4887610ed491680af1b00f65c19f59054592ee0cce2b0f2",
      mediaType: "image/jpeg",
      width: 746,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 41,
      detailGalleryOrder: 41,
      alt: "Forest City Golf Hotel property gallery image 41",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-042-42a183b4ac02",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-342497346",
      sourceAssetId: "342497346",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/342497346.jpg?k=2e7bf2c7b8dbd5f28e587ecb73e4a691dc2990440008a0159d569ac61ab25426&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/342497346.jpg?k=2e7bf2c7b8dbd5f28e587ecb73e4a691dc2990440008a0159d569ac61ab25426&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/042-42a183b4ac02cd0e.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/042-42a183b4ac02cd0e.jpg",
      originalSha256:
        "42a183b4ac02cd0ecdc6ac1401e285b80f4d2cd230aaf66e138547ffd1583aaf",
      servedAssetSha256:
        "42a183b4ac02cd0ecdc6ac1401e285b80f4d2cd230aaf66e138547ffd1583aaf",
      mediaType: "image/jpeg",
      width: 1024,
      height: 554,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 42,
      detailGalleryOrder: 42,
      alt: "Forest City Golf Hotel property gallery image 42",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "golf-gallery-043-0f25107cbe12",
      propertyId: "property-clubs-forest-city-golf",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-342641407",
      sourceAssetId: "342641407",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/342641407.jpg?k=f19ca2ac223b1cdf375c64c55872a9878269b6676e18fa3dde9f86c1b2502401&o=",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/342641407.jpg?k=f19ca2ac223b1cdf375c64c55872a9878269b6676e18fa3dde9f86c1b2502401&o=",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/golf/043-0f25107cbe127427.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/golf/043-0f25107cbe127427.jpg",
      originalSha256:
        "0f25107cbe127427434d1172ec4f1f96b575ec5040c3c2e6a54c261005854a67",
      servedAssetSha256:
        "0f25107cbe127427434d1172ec4f1f96b575ec5040c3c2e6a54c261005854a67",
      mediaType: "image/jpeg",
      width: 1024,
      height: 464,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 43,
      detailGalleryOrder: 43,
      alt: "Forest City Golf Hotel property gallery image 43",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
  ],
  "property-clubs-forest-city-marina": [
    {
      id: "marina-gallery-001-d1eb2e058f0c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555692",
      sourceAssetId: "876555692",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555692.jpg?k=4299cca307f409e8c3a0c330976d057a64b2090046207c343f743c1006fa4343",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555692.jpg?k=4299cca307f409e8c3a0c330976d057a64b2090046207c343f743c1006fa4343",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/001-d1eb2e058f0c76ba.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/001-d1eb2e058f0c76ba.jpg",
      originalSha256:
        "d1eb2e058f0c76bab0ae2e1ec6ea487b0216a098924d9e2e857e0406767c1d8a",
      servedAssetSha256:
        "d1eb2e058f0c76bab0ae2e1ec6ea487b0216a098924d9e2e857e0406767c1d8a",
      mediaType: "image/jpeg",
      width: 1024,
      height: 682,
      placement: "detail_gallery_primary",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 1,
      detailGalleryOrder: 1,
      alt: "Forest City Marina Hotel featured view",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-002-1deca31c18f7",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555627",
      sourceAssetId: "876555627",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555627.jpg?k=ef8e8a12563707ff0955cd6b44a23b26509b10dfc5a3d63f8ea883dcfe60f2a5",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555627.jpg?k=ef8e8a12563707ff0955cd6b44a23b26509b10dfc5a3d63f8ea883dcfe60f2a5",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/002-1deca31c18f7f331.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/002-1deca31c18f7f331.jpg",
      originalSha256:
        "1deca31c18f7f331fab07f2f776443233aae8d6911e996135355fcbe911f9e8c",
      servedAssetSha256:
        "1deca31c18f7f331fab07f2f776443233aae8d6911e996135355fcbe911f9e8c",
      mediaType: "image/jpeg",
      width: 1024,
      height: 682,
      placement: "search_card_primary",
      searchPlacement: "search_card_primary",
      galleryGroup: "Property gallery",
      galleryOrder: 2,
      detailGalleryOrder: 2,
      alt: "Forest City Marina Hotel exterior",
      focalPoint: {
        x: 0.5,
        y: 0.48,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-003-d7a28cc9496c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555677",
      sourceAssetId: "876555677",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555677.jpg?k=843a9aff2a4ef6c943e1d0d893a2fa6f7229e879d07535b76904fffd91830d12",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555677.jpg?k=843a9aff2a4ef6c943e1d0d893a2fa6f7229e879d07535b76904fffd91830d12",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/003-d7a28cc9496ce522.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/003-d7a28cc9496ce522.jpg",
      originalSha256:
        "d7a28cc9496ce522a70af4f12692711604b1e4ebfb5d9f9d8d1ac0646bb4fda5",
      servedAssetSha256:
        "d7a28cc9496ce522a70af4f12692711604b1e4ebfb5d9f9d8d1ac0646bb4fda5",
      mediaType: "image/jpeg",
      width: 1024,
      height: 682,
      placement: "destination",
      searchPlacement: "destination",
      galleryGroup: "Property gallery",
      galleryOrder: 3,
      detailGalleryOrder: 3,
      alt: "Forest City Marina Hotel lobby",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-004-07ed52618a3e",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556229",
      sourceAssetId: "876556229",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556229.jpg?k=02970c1f3fafc90183c6e2c12b198cdce63e470af6c6b0836242742c23950cff",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556229.jpg?k=02970c1f3fafc90183c6e2c12b198cdce63e470af6c6b0836242742c23950cff",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/004-07ed52618a3e0455.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/004-07ed52618a3e0455.jpg",
      originalSha256:
        "07ed52618a3e0455b4f7191c1ac04e6b1a8e9acc9bc6f900523761fd9aa45fa8",
      servedAssetSha256:
        "07ed52618a3e0455b4f7191c1ac04e6b1a8e9acc9bc6f900523761fd9aa45fa8",
      mediaType: "image/jpeg",
      width: 1024,
      height: 682,
      placement: "forest_city_overview",
      searchPlacement: "forest_city_overview",
      galleryGroup: "Property gallery",
      galleryOrder: 4,
      detailGalleryOrder: 4,
      alt: "Forest City waterfront landscape near the hotels",
      focalPoint: {
        x: 0.5,
        y: 0.48,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-005-89287a873894",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-904904009",
      sourceAssetId: "904904009",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904009.jpg?k=afc8bc1378ef6e7cd83eb4d7646cce486d87d9e459ea9902e2ba993c00b62c51",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904009.jpg?k=afc8bc1378ef6e7cd83eb4d7646cce486d87d9e459ea9902e2ba993c00b62c51",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/005-89287a873894fb48.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/005-89287a873894fb48.jpg",
      originalSha256:
        "89287a873894fb48b1ba03a70ff7d4d770663cdf4f882d058ed7bb1ad0ff534c",
      servedAssetSha256:
        "89287a873894fb48b1ba03a70ff7d4d770663cdf4f882d058ed7bb1ad0ff534c",
      mediaType: "image/jpeg",
      width: 1024,
      height: 683,
      placement: "sfz_context",
      searchPlacement: "sfz_context",
      galleryGroup: "Property gallery",
      galleryOrder: 5,
      detailGalleryOrder: 5,
      alt: "Forest City Marina Hotel pool and landscaped grounds",
      focalPoint: {
        x: 0.5,
        y: 0.56,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-006-612e4a5a4753",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-612e4a5a47534de8",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/feature/home-feature-entertainment.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/feature/home-feature-entertainment.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/006-612e4a5a47534de8.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/006-612e4a5a47534de8.jpg",
      originalSha256:
        "612e4a5a47534de8cf9aef73e877059dc7345b18b77632a7689d2fcba9122e05",
      servedAssetSha256:
        "612e4a5a47534de8cf9aef73e877059dc7345b18b77632a7689d2fcba9122e05",
      mediaType: "image/jpeg",
      width: 600,
      height: 620,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Exterior",
      galleryOrder: 6,
      detailGalleryOrder: 6,
      alt: "Forest City Marina Hotel exterior image 6",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-007-4a686e1cd5e0",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-4a686e1cd5e07ff9",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/slide/slide-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/slide/slide-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/007-4a686e1cd5e07ff9.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/007-4a686e1cd5e07ff9.jpg",
      originalSha256:
        "4a686e1cd5e07ff9c62cbce013e87c5a94ec75b2078ea5ed508af72454d838fc",
      servedAssetSha256:
        "4a686e1cd5e07ff9c62cbce013e87c5a94ec75b2078ea5ed508af72454d838fc",
      mediaType: "image/jpeg",
      width: 1920,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: "collection_marina_hospitality",
      galleryGroup: "Exterior",
      galleryOrder: 7,
      detailGalleryOrder: 7,
      alt: "Forest City Marina Hotel exterior",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-008-c21d163befb9",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-c21d163befb91889",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/slide/slide-006.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/slide/slide-006.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/008-c21d163befb91889.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/008-c21d163befb91889.jpg",
      originalSha256:
        "c21d163befb91889b63c67efb66f24fc12cbdd947e14b6517fdf48d26bee73fc",
      servedAssetSha256:
        "c21d163befb91889b63c67efb66f24fc12cbdd947e14b6517fdf48d26bee73fc",
      mediaType: "image/jpeg",
      width: 1920,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Exterior",
      galleryOrder: 8,
      detailGalleryOrder: 8,
      alt: "Forest City Marina Hotel exterior image 8",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-009-6303b8fa4960",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-6303b8fa4960c579",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/slide/slide-007.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/slide/slide-007.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/009-6303b8fa4960c579.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/009-6303b8fa4960c579.jpg",
      originalSha256:
        "6303b8fa4960c579530bdf6c353de4c667ddefd9e659f29cfc458819377a9066",
      servedAssetSha256:
        "6303b8fa4960c579530bdf6c353de4c667ddefd9e659f29cfc458819377a9066",
      mediaType: "image/jpeg",
      width: 1920,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Exterior",
      galleryOrder: 9,
      detailGalleryOrder: 9,
      alt: "Forest City Marina Hotel exterior image 9",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-010-8e9f49db19e3",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-8e9f49db19e3ce85",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/room/home-superior-suite.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/room/home-superior-suite.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/010-8e9f49db19e3ce85.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/010-8e9f49db19e3ce85.jpg",
      originalSha256:
        "8e9f49db19e3ce857470293a3f51d006beb89f1be1de653ad12717e47f5c18b5",
      servedAssetSha256:
        "8e9f49db19e3ce857470293a3f51d006beb89f1be1de653ad12717e47f5c18b5",
      mediaType: "image/jpeg",
      width: 600,
      height: 420,
      placement: "gallery_supporting",
      searchPlacement: "collection_member_monthly_stays",
      galleryGroup: "Rooms & Suites",
      galleryOrder: 10,
      detailGalleryOrder: 10,
      alt: "Suite interior at Forest City Marina Hotel",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-011-ef231c28ca8c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-ef231c28ca8c6f32",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/creamofmushroom.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/creamofmushroom.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/011-ef231c28ca8c6f32.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/011-ef231c28ca8c6f32.jpg",
      originalSha256:
        "ef231c28ca8c6f32a79c8ec60269782e72d2af32d30bf716b2863718bc9ae51d",
      servedAssetSha256:
        "ef231c28ca8c6f32a79c8ec60269782e72d2af32d30bf716b2863718bc9ae51d",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 11,
      detailGalleryOrder: 11,
      alt: "Forest City Marina Hotel rooms & suites image 11",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-012-9e041bb2de3c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-9e041bb2de3c63d1",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/deluxe-suite.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/deluxe-suite.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/012-9e041bb2de3c63d1.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/012-9e041bb2de3c63d1.jpg",
      originalSha256:
        "9e041bb2de3c63d15672811804f35f12e99b368bf0b1b3aace698c104f75dad8",
      servedAssetSha256:
        "9e041bb2de3c63d15672811804f35f12e99b368bf0b1b3aace698c104f75dad8",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 12,
      detailGalleryOrder: 12,
      alt: "Forest City Marina Hotel rooms & suites image 12",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-013-5d31f6cd8135",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-5d31f6cd81358556",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/deluxe.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/deluxe.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/013-5d31f6cd81358556.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/013-5d31f6cd81358556.jpg",
      originalSha256:
        "5d31f6cd813585564a63c4b1eabef666b340abf47a3044dbea8a644a3d97e548",
      servedAssetSha256:
        "5d31f6cd813585564a63c4b1eabef666b340abf47a3044dbea8a644a3d97e548",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 13,
      detailGalleryOrder: 13,
      alt: "Forest City Marina Hotel rooms & suites image 13",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-014-2018f960f0fa",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-2018f960f0fa82b4",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/presidential-suite.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/presidential-suite.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/014-2018f960f0fa82b4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/014-2018f960f0fa82b4.jpg",
      originalSha256:
        "2018f960f0fa82b47185f77a2f1988db504f2a2edc0e5fe8e6b242a677d9f1d8",
      servedAssetSha256:
        "2018f960f0fa82b47185f77a2f1988db504f2a2edc0e5fe8e6b242a677d9f1d8",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 14,
      detailGalleryOrder: 14,
      alt: "Forest City Marina Hotel rooms & suites image 14",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-015-c71288686693",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-c7128868669387f9",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/superior.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/room/superior.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/015-c7128868669387f9.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/015-c7128868669387f9.jpg",
      originalSha256:
        "c7128868669387f90514eb5ae28089d73f3930efc84b8599d5d98b7ae8d70793",
      servedAssetSha256:
        "c7128868669387f90514eb5ae28089d73f3930efc84b8599d5d98b7ae8d70793",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Rooms & Suites",
      galleryOrder: 15,
      detailGalleryOrder: 15,
      alt: "Forest City Marina Hotel rooms & suites image 15",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-016-45bf4b20c11f",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-45bf4b20c11f4797",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/gym-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/gym-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/016-45bf4b20c11f4797.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/016-45bf4b20c11f4797.jpg",
      originalSha256:
        "45bf4b20c11f4797968b1656322154142b1fce44834350b32a625c72a4505f6d",
      servedAssetSha256:
        "45bf4b20c11f4797968b1656322154142b1fce44834350b32a625c72a4505f6d",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Facilities",
      galleryOrder: 16,
      detailGalleryOrder: 16,
      alt: "Forest City Marina Hotel facilities image 16",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-017-f4d0d542df67",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-f4d0d542df67d505",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/gym-002.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/gym-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/017-f4d0d542df67d505.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/017-f4d0d542df67d505.jpg",
      originalSha256:
        "f4d0d542df67d505951a53bf49a685bbaffdc2de2b39b7b775244d72e5ce595c",
      servedAssetSha256:
        "f4d0d542df67d505951a53bf49a685bbaffdc2de2b39b7b775244d72e5ce595c",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Facilities",
      galleryOrder: 17,
      detailGalleryOrder: 17,
      alt: "Forest City Marina Hotel facilities image 17",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-018-18085369eb1a",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-18085369eb1aef02",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/lobby-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/lobby-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/018-18085369eb1aef02.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/018-18085369eb1aef02.jpg",
      originalSha256:
        "18085369eb1aef02d4ed8e292f99b95ada242cfa895ea5e686e9cf29093d7697",
      servedAssetSha256:
        "18085369eb1aef02d4ed8e292f99b95ada242cfa895ea5e686e9cf29093d7697",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Facilities",
      galleryOrder: 18,
      detailGalleryOrder: 18,
      alt: "Forest City Marina Hotel facilities image 18",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-019-d7f6162abeaf",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-d7f6162abeafb587",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/lobby-002.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/lobby-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/019-d7f6162abeafb587.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/019-d7f6162abeafb587.jpg",
      originalSha256:
        "d7f6162abeafb587186cda11a1f807e6300134f0ee2be737295323183d0cd4cd",
      servedAssetSha256:
        "d7f6162abeafb587186cda11a1f807e6300134f0ee2be737295323183d0cd4cd",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Facilities",
      galleryOrder: 19,
      detailGalleryOrder: 19,
      alt: "Forest City Marina Hotel facilities image 19",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-020-2576155d7057",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-2576155d70571dae",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/pool-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/pool-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/020-2576155d70571dae.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/020-2576155d70571dae.jpg",
      originalSha256:
        "2576155d70571dae8559b2b74252f54cdc9e66be776a48e4b6e7151a5eb3e788",
      servedAssetSha256:
        "2576155d70571dae8559b2b74252f54cdc9e66be776a48e4b6e7151a5eb3e788",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: "promo_book_and_relax",
      galleryGroup: "Facilities",
      galleryOrder: 20,
      detailGalleryOrder: 20,
      alt: "Pool beside Forest City Marina Hotel",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-021-40cfd19190bb",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-40cfd19190bbcc9a",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/pool-002.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/pool-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/021-40cfd19190bbcc9a.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/021-40cfd19190bbcc9a.jpg",
      originalSha256:
        "40cfd19190bbcc9a3ece5bbd18e2e059387b7af5b5ecf03748026b07061acd6f",
      servedAssetSha256:
        "40cfd19190bbcc9a3ece5bbd18e2e059387b7af5b5ecf03748026b07061acd6f",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: "editorial_search_map_detail_pages",
      galleryGroup: "Facilities",
      galleryOrder: 21,
      detailGalleryOrder: 21,
      alt: "Pool and hotel gardens at Forest City Marina Hotel",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-022-28760406b1e9",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-28760406b1e9f1a6",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/pool-003.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/pool-003.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/022-28760406b1e9f1a6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/022-28760406b1e9f1a6.jpg",
      originalSha256:
        "28760406b1e9f1a6c63acd24eb0fe682790dad8628dd5994e6d8e02fcdf9e046",
      servedAssetSha256:
        "28760406b1e9f1a6c63acd24eb0fe682790dad8628dd5994e6d8e02fcdf9e046",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Facilities",
      galleryOrder: 22,
      detailGalleryOrder: 22,
      alt: "Forest City Marina Hotel facilities image 22",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-023-df387d11ec3f",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-df387d11ec3fbdc7",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/private-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/private-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/023-df387d11ec3fbdc7.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/023-df387d11ec3fbdc7.jpg",
      originalSha256:
        "df387d11ec3fbdc73f64061e5d779425ab0f4146ca90019912f2a26f73a9b952",
      servedAssetSha256:
        "df387d11ec3fbdc73f64061e5d779425ab0f4146ca90019912f2a26f73a9b952",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Facilities",
      galleryOrder: 23,
      detailGalleryOrder: 23,
      alt: "Forest City Marina Hotel facilities image 23",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-024-6fc12de3a094",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-6fc12de3a09423fb",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/private-002.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/private-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/024-6fc12de3a09423fb.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/024-6fc12de3a09423fb.jpg",
      originalSha256:
        "6fc12de3a09423fb1c59d1cddb9efb1e7d92f6eab32a5656e5096e9b7f2941b2",
      servedAssetSha256:
        "6fc12de3a09423fb1c59d1cddb9efb1e7d92f6eab32a5656e5096e9b7f2941b2",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Facilities",
      galleryOrder: 24,
      detailGalleryOrder: 24,
      alt: "Forest City Marina Hotel facilities image 24",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-025-68c8ef00973e",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-68c8ef00973ed706",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/restaurant-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/restaurant-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/025-68c8ef00973ed706.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/025-68c8ef00973ed706.jpg",
      originalSha256:
        "68c8ef00973ed706d2c486ad70334f076d0a0bb75417d5b51a51046f4f65ad71",
      servedAssetSha256:
        "68c8ef00973ed706d2c486ad70334f076d0a0bb75417d5b51a51046f4f65ad71",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: "editorial_collections_for_stay_types",
      galleryGroup: "Dining",
      galleryOrder: 25,
      detailGalleryOrder: 25,
      alt: "Restaurant at Forest City Marina Hotel",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-026-c31e9e702af1",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-c31e9e702af1160d",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/restaurant-002.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/restaurant-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/026-c31e9e702af1160d.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/026-c31e9e702af1160d.jpg",
      originalSha256:
        "c31e9e702af1160d709110f8c374eb735e044745613655bfafe0ea3028ec4431",
      servedAssetSha256:
        "c31e9e702af1160d709110f8c374eb735e044745613655bfafe0ea3028ec4431",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 26,
      detailGalleryOrder: 26,
      alt: "Forest City Marina Hotel dining image 26",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-027-ba31cfc4216b",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-ba31cfc4216b1885",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/feature/home-feature-restaurant.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/feature/home-feature-restaurant.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/027-ba31cfc4216b1885.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/027-ba31cfc4216b1885.jpg",
      originalSha256:
        "ba31cfc4216b18856975a1c05d71fbcabd691b5c241128ee5f141f7c900c7c56",
      servedAssetSha256:
        "ba31cfc4216b18856975a1c05d71fbcabd691b5c241128ee5f141f7c900c7c56",
      mediaType: "image/jpeg",
      width: 600,
      height: 620,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 27,
      detailGalleryOrder: 27,
      alt: "Forest City Marina Hotel dining image 27",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-028-6205077a7069",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-6205077a7069f29d",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/asianskewer.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/asianskewer.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/028-6205077a7069f29d.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/028-6205077a7069f29d.jpg",
      originalSha256:
        "6205077a7069f29dd03aa0669808f28f657054925397f2192601b0cd9bbdfbb2",
      servedAssetSha256:
        "6205077a7069f29dd03aa0669808f28f657054925397f2192601b0cd9bbdfbb2",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 28,
      detailGalleryOrder: 28,
      alt: "Forest City Marina Hotel dining image 28",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-029-38b0e550ffd6",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-38b0e550ffd6ffff",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/beefhorfun.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/beefhorfun.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/029-38b0e550ffd6ffff.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/029-38b0e550ffd6ffff.jpg",
      originalSha256:
        "38b0e550ffd6ffffe11edb4e3aa07376b02c0ca6a0663bf18bf665c8e79f3b44",
      servedAssetSha256:
        "38b0e550ffd6ffffe11edb4e3aa07376b02c0ca6a0663bf18bf665c8e79f3b44",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 29,
      detailGalleryOrder: 29,
      alt: "Forest City Marina Hotel dining image 29",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-030-4b40565d24a6",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-4b40565d24a61369",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/bento-creamytomato.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/bento-creamytomato.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/030-4b40565d24a61369.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/030-4b40565d24a61369.jpg",
      originalSha256:
        "4b40565d24a61369995e3fe26ae2f436073b0cc9c57ea8441084cee91d7d5969",
      servedAssetSha256:
        "4b40565d24a61369995e3fe26ae2f436073b0cc9c57ea8441084cee91d7d5969",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 30,
      detailGalleryOrder: 30,
      alt: "Forest City Marina Hotel dining image 30",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-031-2ad4bac85bd3",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-2ad4bac85bd30dc8",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/bento-seabassteriyaki.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/bento-seabassteriyaki.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/031-2ad4bac85bd30dc8.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/031-2ad4bac85bd30dc8.jpg",
      originalSha256:
        "2ad4bac85bd30dc82cb6cb3aeae2b3fa047a64932ea3f8aa7d98f84aeda061ed",
      servedAssetSha256:
        "2ad4bac85bd30dc82cb6cb3aeae2b3fa047a64932ea3f8aa7d98f84aeda061ed",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 31,
      detailGalleryOrder: 31,
      alt: "Forest City Marina Hotel dining image 31",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-032-4144d8b87b91",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-4144d8b87b91e13d",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/bento-yangzhou.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/bento-yangzhou.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/032-4144d8b87b91e13d.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/032-4144d8b87b91e13d.jpg",
      originalSha256:
        "4144d8b87b91e13d035e81994698591d762acae685ab2d2c43d88602a8bf5f6c",
      servedAssetSha256:
        "4144d8b87b91e13d035e81994698591d762acae685ab2d2c43d88602a8bf5f6c",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 32,
      detailGalleryOrder: 32,
      alt: "Forest City Marina Hotel dining image 32",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-033-4aff00c11957",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-4aff00c11957393c",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/betawiuduk.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/betawiuduk.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/033-4aff00c11957393c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/033-4aff00c11957393c.jpg",
      originalSha256:
        "4aff00c11957393c1775adb6b6d7bf5e6a76d8b9d7e25a17c1e27759e725cafc",
      servedAssetSha256:
        "4aff00c11957393c1775adb6b6d7bf5e6a76d8b9d7e25a17c1e27759e725cafc",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 33,
      detailGalleryOrder: 33,
      alt: "Forest City Marina Hotel dining image 33",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-034-1becbbeeb7ac",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-1becbbeeb7ac3c87",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/carbonara.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/carbonara.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/034-1becbbeeb7ac3c87.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/034-1becbbeeb7ac3c87.jpg",
      originalSha256:
        "1becbbeeb7ac3c8719d369bbf5c388356f3feeeba08c8d8a0622684ab184fa3e",
      servedAssetSha256:
        "1becbbeeb7ac3c8719d369bbf5c388356f3feeeba08c8d8a0622684ab184fa3e",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 34,
      detailGalleryOrder: 34,
      alt: "Forest City Marina Hotel dining image 34",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-035-10ea820f237d",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-10ea820f237d8dfb",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/charkwayteow.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/charkwayteow.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/035-10ea820f237d8dfb.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/035-10ea820f237d8dfb.jpg",
      originalSha256:
        "10ea820f237d8dfbc6ae67754f76a61fafaa5a80c1f62885f70221035bf2cf55",
      servedAssetSha256:
        "10ea820f237d8dfbc6ae67754f76a61fafaa5a80c1f62885f70221035bf2cf55",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 35,
      detailGalleryOrder: 35,
      alt: "Forest City Marina Hotel dining image 35",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-036-81a1fdea5194",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-81a1fdea5194028d",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/cheesesauce.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/cheesesauce.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/036-81a1fdea5194028d.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/036-81a1fdea5194028d.jpg",
      originalSha256:
        "81a1fdea5194028d0452bc1cead42bc400c349486f8ae2d73e7c12acb624bb89",
      servedAssetSha256:
        "81a1fdea5194028d0452bc1cead42bc400c349486f8ae2d73e7c12acb624bb89",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 36,
      detailGalleryOrder: 36,
      alt: "Forest City Marina Hotel dining image 36",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-037-c6ce14486747",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-c6ce1448674753c4",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/chocolatechantilly.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/chocolatechantilly.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/037-c6ce1448674753c4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/037-c6ce1448674753c4.jpg",
      originalSha256:
        "c6ce1448674753c4baaf9d31b51129590a7750b45ae02c56a6e5b213f6ebb772",
      servedAssetSha256:
        "c6ce1448674753c4baaf9d31b51129590a7750b45ae02c56a6e5b213f6ebb772",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 37,
      detailGalleryOrder: 37,
      alt: "Forest City Marina Hotel dining image 37",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-038-ae0237ddf256",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-ae0237ddf2562271",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/chocolatemudcake.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/chocolatemudcake.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/038-ae0237ddf2562271.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/038-ae0237ddf2562271.jpg",
      originalSha256:
        "ae0237ddf25622719e2deac1375445314a990dcb946f377eaf9bfae20880f118",
      servedAssetSha256:
        "ae0237ddf25622719e2deac1375445314a990dcb946f377eaf9bfae20880f118",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 38,
      detailGalleryOrder: 38,
      alt: "Forest City Marina Hotel dining image 38",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-039-1596663085ae",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-1596663085aee263",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/clubsandwich.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/clubsandwich.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/039-1596663085aee263.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/039-1596663085aee263.jpg",
      originalSha256:
        "1596663085aee263165837b50850d23e4af8f1a0b93e0f07786d1e472534a1e0",
      servedAssetSha256:
        "1596663085aee263165837b50850d23e4af8f1a0b93e0f07786d1e472534a1e0",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 39,
      detailGalleryOrder: 39,
      alt: "Forest City Marina Hotel dining image 39",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-040-978df3bd8eb7",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-978df3bd8eb74b39",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/fcdouble.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/fcdouble.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/040-978df3bd8eb74b39.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/040-978df3bd8eb74b39.jpg",
      originalSha256:
        "978df3bd8eb74b3974a6202dffa4cbb592e63d8d30718d9da5dc118cfabe2568",
      servedAssetSha256:
        "978df3bd8eb74b3974a6202dffa4cbb592e63d8d30718d9da5dc118cfabe2568",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 40,
      detailGalleryOrder: 40,
      alt: "Forest City Marina Hotel dining image 40",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-041-69af1deaf431",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-69af1deaf431714c",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/fries.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/fries.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/041-69af1deaf431714c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/041-69af1deaf431714c.jpg",
      originalSha256:
        "69af1deaf431714c88f2c1f744a9c48f7ed2ca6a2ed987dfd102f7e5fbf94748",
      servedAssetSha256:
        "69af1deaf431714c88f2c1f744a9c48f7ed2ca6a2ed987dfd102f7e5fbf94748",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 41,
      detailGalleryOrder: 41,
      alt: "Forest City Marina Hotel dining image 41",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-042-c59d64556f9b",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-c59d64556f9b2d4a",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/fruitrojak.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/fruitrojak.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/042-c59d64556f9b2d4a.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/042-c59d64556f9b2d4a.jpg",
      originalSha256:
        "c59d64556f9b2d4a066c5ae374ba25829701cd93dd4cf2c7b13fdbbc39b27727",
      servedAssetSha256:
        "c59d64556f9b2d4a066c5ae374ba25829701cd93dd4cf2c7b13fdbbc39b27727",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 42,
      detailGalleryOrder: 42,
      alt: "Forest City Marina Hotel dining image 42",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-043-60d70a071e29",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-60d70a071e29ffca",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/fruits.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/fruits.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/043-60d70a071e29ffca.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/043-60d70a071e29ffca.jpg",
      originalSha256:
        "60d70a071e29ffca011fb21e7fcd8829897fd01444f7d41a5f1e913f2ba03a51",
      servedAssetSha256:
        "60d70a071e29ffca011fb21e7fcd8829897fd01444f7d41a5f1e913f2ba03a51",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 43,
      detailGalleryOrder: 43,
      alt: "Forest City Marina Hotel dining image 43",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-044-a64f4763b3b8",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-a64f4763b3b84f95",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/hainanesechicken.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/hainanesechicken.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/044-a64f4763b3b84f95.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/044-a64f4763b3b84f95.jpg",
      originalSha256:
        "a64f4763b3b84f9590c656388bee7a0cd9ba8000be645581ade6e9fb3a2b3bfe",
      servedAssetSha256:
        "a64f4763b3b84f9590c656388bee7a0cd9ba8000be645581ade6e9fb3a2b3bfe",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 44,
      detailGalleryOrder: 44,
      alt: "Forest City Marina Hotel dining image 44",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-045-473e97e9301d",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-473e97e9301df36b",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/kampungfriedrice.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/kampungfriedrice.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/045-473e97e9301df36b.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/045-473e97e9301df36b.jpg",
      originalSha256:
        "473e97e9301df36ba61d617e9309da06bbe3cf3ff199f7bf5afc3b9599de821a",
      servedAssetSha256:
        "473e97e9301df36ba61d617e9309da06bbe3cf3ff199f7bf5afc3b9599de821a",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 45,
      detailGalleryOrder: 45,
      alt: "Forest City Marina Hotel dining image 45",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-046-2791ca9a45d4",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-2791ca9a45d45dd8",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/mamakfriednoodles.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/mamakfriednoodles.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/046-2791ca9a45d45dd8.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/046-2791ca9a45d45dd8.jpg",
      originalSha256:
        "2791ca9a45d45dd8bf9c7e4263729344f7c72bc16f30d373ea820c4dc5e72f3f",
      servedAssetSha256:
        "2791ca9a45d45dd8bf9c7e4263729344f7c72bc16f30d373ea820c4dc5e72f3f",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 46,
      detailGalleryOrder: 46,
      alt: "Forest City Marina Hotel dining image 46",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-047-44c91d895e47",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-44c91d895e4703fe",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/miso-tart.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/miso-tart.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/047-44c91d895e4703fe.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/047-44c91d895e4703fe.jpg",
      originalSha256:
        "44c91d895e4703febac272d16f1301e9be392074c6e845dfac66d72ad3b3fbe5",
      servedAssetSha256:
        "44c91d895e4703febac272d16f1301e9be392074c6e845dfac66d72ad3b3fbe5",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 47,
      detailGalleryOrder: 47,
      alt: "Forest City Marina Hotel dining image 47",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-048-18628ab28c00",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-18628ab28c00614c",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/rice.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/rice.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/048-18628ab28c00614c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/048-18628ab28c00614c.jpg",
      originalSha256:
        "18628ab28c00614c03301d2bad5647e80c1f49d75c9b6518e8c70ce050bb6add",
      servedAssetSha256:
        "18628ab28c00614c03301d2bad5647e80c1f49d75c9b6518e8c70ce050bb6add",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 48,
      detailGalleryOrder: 48,
      alt: "Forest City Marina Hotel dining image 48",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-049-3bc6e07083b8",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-3bc6e07083b851c7",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/todmunggong.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/todmunggong.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/049-3bc6e07083b851c7.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/049-3bc6e07083b851c7.jpg",
      originalSha256:
        "3bc6e07083b851c7c187d10d7cecba831664be1c29ea37fa9e5772389097a3c8",
      servedAssetSha256:
        "3bc6e07083b851c7c187d10d7cecba831664be1c29ea37fa9e5772389097a3c8",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 49,
      detailGalleryOrder: 49,
      alt: "Forest City Marina Hotel dining image 49",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-050-7641c08c686d",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-7641c08c686d6124",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/tomyam.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/tomyam.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/050-7641c08c686d6124.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/050-7641c08c686d6124.jpg",
      originalSha256:
        "7641c08c686d6124bda2aa134b56029651caa974d4409cc404de9afe2928f393",
      servedAssetSha256:
        "7641c08c686d6124bda2aa134b56029651caa974d4409cc404de9afe2928f393",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 50,
      detailGalleryOrder: 50,
      alt: "Forest City Marina Hotel dining image 50",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-051-aed417b6b606",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-aed417b6b60697ee",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/wedges.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/menu/wedges.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/051-aed417b6b60697ee.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/051-aed417b6b60697ee.jpg",
      originalSha256:
        "aed417b6b60697ee02ad3dd7c6eaa311d6759390ff1085789ebd48d5e5f3a002",
      servedAssetSha256:
        "aed417b6b60697ee02ad3dd7c6eaa311d6759390ff1085789ebd48d5e5f3a002",
      mediaType: "image/jpeg",
      width: 500,
      height: 500,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Dining",
      galleryOrder: 51,
      detailGalleryOrder: 51,
      alt: "Forest City Marina Hotel dining image 51",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-052-d06f7e475a21",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-d06f7e475a21fc66",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/beach-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/beach-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/052-d06f7e475a21fc66.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/052-d06f7e475a21fc66.jpg",
      originalSha256:
        "d06f7e475a21fc66ccf19d8218bedf12dcdb2cfbf16ab6ebf56107581f3d367e",
      servedAssetSha256:
        "d06f7e475a21fc66ccf19d8218bedf12dcdb2cfbf16ab6ebf56107581f3d367e",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: "destination_forest_city_waterfront",
      galleryGroup: "Golf & Beach",
      galleryOrder: 52,
      detailGalleryOrder: 52,
      alt: "Forest City waterfront beside Marina Hotel",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-053-94dd72ce0762",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-94dd72ce0762e3a7",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/beach-002.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/beach-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/053-94dd72ce0762e3a7.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/053-94dd72ce0762e3a7.jpg",
      originalSha256:
        "94dd72ce0762e3a75b0d2a1cc2f6cd3faac18647e7fd249b1ec90a5af654da6c",
      servedAssetSha256:
        "94dd72ce0762e3a75b0d2a1cc2f6cd3faac18647e7fd249b1ec90a5af654da6c",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 53,
      detailGalleryOrder: 53,
      alt: "Forest City Marina Hotel golf & beach image 53",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-054-f85a2d0d8991",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-f85a2d0d8991b1b9",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/beach-003.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/beach-003.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/054-f85a2d0d8991b1b9.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/054-f85a2d0d8991b1b9.jpg",
      originalSha256:
        "f85a2d0d8991b1b93f2aac38160762516e036d1170e1eef6fcd57a269d0f9eee",
      servedAssetSha256:
        "f85a2d0d8991b1b93f2aac38160762516e036d1170e1eef6fcd57a269d0f9eee",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Golf & Beach",
      galleryOrder: 54,
      detailGalleryOrder: 54,
      alt: "Forest City Marina Hotel golf & beach image 54",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-055-52ff269f4a1c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-52ff269f4a1cd0dd",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/hall-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/hall-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/055-52ff269f4a1cd0dd.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/055-52ff269f4a1cd0dd.jpg",
      originalSha256:
        "52ff269f4a1cd0ddb90affcb19274bae1beebad9d3c8864b4d6db0b7d2d15bad",
      servedAssetSha256:
        "52ff269f4a1cd0ddb90affcb19274bae1beebad9d3c8864b4d6db0b7d2d15bad",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 55,
      detailGalleryOrder: 55,
      alt: "Forest City Marina Hotel meetings & events image 55",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-056-b8ccf913150c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-b8ccf913150c3cfd",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/hall-002.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/hall-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/056-b8ccf913150c3cfd.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/056-b8ccf913150c3cfd.jpg",
      originalSha256:
        "b8ccf913150c3cfdc4bf217947b6d775ecfb6571218ce231c274f29dabbf9c67",
      servedAssetSha256:
        "b8ccf913150c3cfdc4bf217947b6d775ecfb6571218ce231c274f29dabbf9c67",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 56,
      detailGalleryOrder: 56,
      alt: "Forest City Marina Hotel meetings & events image 56",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-057-7aa343e34476",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-7aa343e34476e650",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/hall-003.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/hall-003.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/057-7aa343e34476e650.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/057-7aa343e34476e650.jpg",
      originalSha256:
        "7aa343e34476e65000837a5695e5a24e26774f4abd59d6aed51e81fae0e5d6b5",
      servedAssetSha256:
        "7aa343e34476e65000837a5695e5a24e26774f4abd59d6aed51e81fae0e5d6b5",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 57,
      detailGalleryOrder: 57,
      alt: "Forest City Marina Hotel meetings & events image 57",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-058-d5d8b926e1ff",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-d5d8b926e1ff4e86",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/wedding-001.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/wedding-001.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/058-d5d8b926e1ff4e86.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/058-d5d8b926e1ff4e86.jpg",
      originalSha256:
        "d5d8b926e1ff4e86cdd4c8abe0c6d0991cfde1e72e318438f3fc048f6fd4611a",
      servedAssetSha256:
        "d5d8b926e1ff4e86cdd4c8abe0c6d0991cfde1e72e318438f3fc048f6fd4611a",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 58,
      detailGalleryOrder: 58,
      alt: "Forest City Marina Hotel meetings & events image 58",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-059-a3f1a06e2ffa",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-a3f1a06e2ffa7ba5",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/wedding-002.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/wedding-002.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/059-a3f1a06e2ffa7ba5.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/059-a3f1a06e2ffa7ba5.jpg",
      originalSha256:
        "a3f1a06e2ffa7ba573cb85d6c20a16891feab3e16cef8092cccdfbdb0f3fa511",
      servedAssetSha256:
        "a3f1a06e2ffa7ba573cb85d6c20a16891feab3e16cef8092cccdfbdb0f3fa511",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 59,
      detailGalleryOrder: 59,
      alt: "Forest City Marina Hotel meetings & events image 59",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-060-61aaaba53cc8",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-61aaaba53cc89cd8",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/wedding-003.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/facilities/wedding-003.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/060-61aaaba53cc89cd8.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/060-61aaaba53cc89cd8.jpg",
      originalSha256:
        "61aaaba53cc89cd86552eec6335d2a67625aee26cf8380723b8e5505fb31fc56",
      servedAssetSha256:
        "61aaaba53cc89cd86552eec6335d2a67625aee26cf8380723b8e5505fb31fc56",
      mediaType: "image/jpeg",
      width: 1000,
      height: 700,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 60,
      detailGalleryOrder: 60,
      alt: "Forest City Marina Hotel meetings & events image 60",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-061-970ede1d7f04",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-970ede1d7f04fae0",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/feature/home-feature-conference.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/feature/home-feature-conference.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/061-970ede1d7f04fae0.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/061-970ede1d7f04fae0.jpg",
      originalSha256:
        "970ede1d7f04fae02094ee9187bb522df275f7ebaa5b7f69e8fde260c5bb82cc",
      servedAssetSha256:
        "970ede1d7f04fae02094ee9187bb522df275f7ebaa5b7f69e8fde260c5bb82cc",
      mediaType: "image/jpeg",
      width: 600,
      height: 620,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 61,
      detailGalleryOrder: 61,
      alt: "Forest City Marina Hotel meetings & events image 61",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-062-fb6e9c6d437d",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-fb6e9c6d437d41bf",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/feature/home-feature-events.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/feature/home-feature-events.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/062-fb6e9c6d437d41bf.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/062-fb6e9c6d437d41bf.jpg",
      originalSha256:
        "fb6e9c6d437d41bf5d4bdc57fa18250c630d2ddfbb13c6aef69e1d3377e9fa65",
      servedAssetSha256:
        "fb6e9c6d437d41bf5d4bdc57fa18250c630d2ddfbb13c6aef69e1d3377e9fa65",
      mediaType: "image/jpeg",
      width: 600,
      height: 620,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 62,
      detailGalleryOrder: 62,
      alt: "Forest City Marina Hotel meetings & events image 62",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-063-430c2ef5a564",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-430c2ef5a564cf8c",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/meeting-events/home-meeting-events.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/meeting-events/home-meeting-events.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/063-430c2ef5a564cf8c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/063-430c2ef5a564cf8c.jpg",
      originalSha256:
        "430c2ef5a564cf8c61b0433862e13d3cfe5811b41b07086efaace4aafe6357c0",
      servedAssetSha256:
        "430c2ef5a564cf8c61b0433862e13d3cfe5811b41b07086efaace4aafe6357c0",
      mediaType: "image/jpeg",
      width: 800,
      height: 510,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 63,
      detailGalleryOrder: 63,
      alt: "Forest City Marina Hotel meetings & events image 63",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-064-0dec0161e435",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "forest_city_marina_hotel_official",
      sourceEvidenceId: "official-hotel-asset-0dec0161e4358807",
      sourceAssetId: null,
      sourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/meeting-events/home-wedding-celebrations.jpg",
      finalSourceUrl:
        "https://www.fcmarinahotel.com/images/1_Phoenix_Hotel/home/meeting-events/home-wedding-celebrations.jpg",
      observedAt: "2026-08-28",
      authority: "owner_authorized_official_hotel_media",
      licenseReceiptId:
        "CCLUB-V2552-OFFICIAL-HOTEL-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/064-0dec0161e4358807.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/064-0dec0161e4358807.jpg",
      originalSha256:
        "0dec0161e435880794aed1ffcb2e9f58b3e79e933dd1d5cffb084da9eab19a3a",
      servedAssetSha256:
        "0dec0161e435880794aed1ffcb2e9f58b3e79e933dd1d5cffb084da9eab19a3a",
      mediaType: "image/jpeg",
      width: 800,
      height: 510,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Meetings & Events",
      galleryOrder: 64,
      detailGalleryOrder: 64,
      alt: "Forest City Marina Hotel meetings & events image 64",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-065-200e920eec8a",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555646",
      sourceAssetId: "876555646",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555646.jpg?k=1d5e94ed3a6d856dacc49f631bc10d71a4c21e0cb36e89c3214b97c039925776",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555646.jpg?k=1d5e94ed3a6d856dacc49f631bc10d71a4c21e0cb36e89c3214b97c039925776",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/065-200e920eec8aa7b6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/065-200e920eec8aa7b6.jpg",
      originalSha256:
        "200e920eec8aa7b63420d0c5081c0ba5a90322fdc86709dc98662ed5a6d45042",
      servedAssetSha256:
        "200e920eec8aa7b63420d0c5081c0ba5a90322fdc86709dc98662ed5a6d45042",
      mediaType: "image/jpeg",
      width: 1024,
      height: 683,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 65,
      detailGalleryOrder: 65,
      alt: "Forest City Marina Hotel property gallery image 65",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-066-a56cbbf19a52",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555664",
      sourceAssetId: "876555664",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555664.jpg?k=54fc3fa00e1ab87e1c3863fffa6e14777acc14b0e087b1683c3067c93111521d",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555664.jpg?k=54fc3fa00e1ab87e1c3863fffa6e14777acc14b0e087b1683c3067c93111521d",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/066-a56cbbf19a521fc6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/066-a56cbbf19a521fc6.jpg",
      originalSha256:
        "a56cbbf19a521fc6347a30def9cbf4942086ebbbe6a9f5d2b7e1fb6624d09267",
      servedAssetSha256:
        "a56cbbf19a521fc6347a30def9cbf4942086ebbbe6a9f5d2b7e1fb6624d09267",
      mediaType: "image/jpeg",
      width: 505,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 66,
      detailGalleryOrder: 66,
      alt: "Forest City Marina Hotel property gallery image 66",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-067-5aef5c073153",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555708",
      sourceAssetId: "876555708",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555708.jpg?k=b1568775149cdac12d5b5f50ca0e4f093de795b3624f445bb442ee76fd168c7e",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555708.jpg?k=b1568775149cdac12d5b5f50ca0e4f093de795b3624f445bb442ee76fd168c7e",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/067-5aef5c0731531bf6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/067-5aef5c0731531bf6.jpg",
      originalSha256:
        "5aef5c0731531bf6ee1331ab717f78a775cc3e5dcd791ebc7cc9aabb2be38d85",
      servedAssetSha256:
        "5aef5c0731531bf6ee1331ab717f78a775cc3e5dcd791ebc7cc9aabb2be38d85",
      mediaType: "image/jpeg",
      width: 1024,
      height: 682,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 67,
      detailGalleryOrder: 67,
      alt: "Forest City Marina Hotel property gallery image 67",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-068-16c95bc7e40d",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555855",
      sourceAssetId: "876555855",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555855.jpg?k=589aed91eb215db3e87484012027ee8a3e71bfd9057731ea58d2fd6dd0680123",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555855.jpg?k=589aed91eb215db3e87484012027ee8a3e71bfd9057731ea58d2fd6dd0680123",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/068-16c95bc7e40d1ee6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/068-16c95bc7e40d1ee6.jpg",
      originalSha256:
        "16c95bc7e40d1ee6c9c0e19a16ee7d4bc46574c025e87293df3e545625b62ff8",
      servedAssetSha256:
        "16c95bc7e40d1ee6c9c0e19a16ee7d4bc46574c025e87293df3e545625b62ff8",
      mediaType: "image/jpeg",
      width: 1024,
      height: 680,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 68,
      detailGalleryOrder: 68,
      alt: "Forest City Marina Hotel property gallery image 68",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-069-809ca3f06fb3",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555908",
      sourceAssetId: "876555908",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555908.jpg?k=e62e6b1efa6624072b61f7971c26d14bcf5903c973abcee460ff6c6c0809c985",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555908.jpg?k=e62e6b1efa6624072b61f7971c26d14bcf5903c973abcee460ff6c6c0809c985",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/069-809ca3f06fb39f11.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/069-809ca3f06fb39f11.jpg",
      originalSha256:
        "809ca3f06fb39f11baf12d2c9a8207bf56e1fa99332257c5be3af03fe89c04a9",
      servedAssetSha256:
        "809ca3f06fb39f11baf12d2c9a8207bf56e1fa99332257c5be3af03fe89c04a9",
      mediaType: "image/jpeg",
      width: 1024,
      height: 522,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 69,
      detailGalleryOrder: 69,
      alt: "Forest City Marina Hotel property gallery image 69",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-070-ff9224c7a24e",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555966",
      sourceAssetId: "876555966",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555966.jpg?k=921bf50767143d4b01afd4b7f5a85044706497c7ff047289e951ce51ddd4b202",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555966.jpg?k=921bf50767143d4b01afd4b7f5a85044706497c7ff047289e951ce51ddd4b202",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/070-ff9224c7a24e831b.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/070-ff9224c7a24e831b.jpg",
      originalSha256:
        "ff9224c7a24e831b53fae1bbc31fc43ea6fd20d5f8da88f5e37c02e4c2eef329",
      servedAssetSha256:
        "ff9224c7a24e831b53fae1bbc31fc43ea6fd20d5f8da88f5e37c02e4c2eef329",
      mediaType: "image/jpeg",
      width: 572,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 70,
      detailGalleryOrder: 70,
      alt: "Forest City Marina Hotel property gallery image 70",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-071-901d089ec778",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555980",
      sourceAssetId: "876555980",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555980.jpg?k=4a47bf0aa00533923fadf49f4b55fd866ab5721c1799ce05108755d3b3ece9a2",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555980.jpg?k=4a47bf0aa00533923fadf49f4b55fd866ab5721c1799ce05108755d3b3ece9a2",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/071-901d089ec778ef6f.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/071-901d089ec778ef6f.jpg",
      originalSha256:
        "901d089ec778ef6f4cbe67a8998b0b84cc774941813630bcb37e9c7f6b46d358",
      servedAssetSha256:
        "901d089ec778ef6f4cbe67a8998b0b84cc774941813630bcb37e9c7f6b46d358",
      mediaType: "image/jpeg",
      width: 1024,
      height: 681,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 71,
      detailGalleryOrder: 71,
      alt: "Forest City Marina Hotel property gallery image 71",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-072-d615099a0772",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876555994",
      sourceAssetId: "876555994",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555994.jpg?k=5f9c2954f60bffd433e0359e1f5ecd2732321433e8173b6e36ed53aff603ce4f",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876555994.jpg?k=5f9c2954f60bffd433e0359e1f5ecd2732321433e8173b6e36ed53aff603ce4f",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/072-d615099a077250d9.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/072-d615099a077250d9.jpg",
      originalSha256:
        "d615099a077250d9e9c8583b60b5c2438b3ddaf4f60a71945927107cba675dff",
      servedAssetSha256:
        "d615099a077250d9e9c8583b60b5c2438b3ddaf4f60a71945927107cba675dff",
      mediaType: "image/jpeg",
      width: 1024,
      height: 636,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 72,
      detailGalleryOrder: 72,
      alt: "Forest City Marina Hotel property gallery image 72",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-073-99edc54a988e",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556089",
      sourceAssetId: "876556089",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556089.jpg?k=338e2e25181ed5dcac85329d45e7117a8e6da82563fbb82dea5107bff775ad31",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556089.jpg?k=338e2e25181ed5dcac85329d45e7117a8e6da82563fbb82dea5107bff775ad31",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/073-99edc54a988e8292.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/073-99edc54a988e8292.jpg",
      originalSha256:
        "99edc54a988e8292733acfae512682a72f4a3cb2eeb2c01ba04b8dc6c711716a",
      servedAssetSha256:
        "99edc54a988e8292733acfae512682a72f4a3cb2eeb2c01ba04b8dc6c711716a",
      mediaType: "image/jpeg",
      width: 1024,
      height: 682,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 73,
      detailGalleryOrder: 73,
      alt: "Forest City Marina Hotel property gallery image 73",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-074-a8d1eee306ac",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556095",
      sourceAssetId: "876556095",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556095.jpg?k=765fdf03aefd1104f8cbc45b12f91997d0e2b0bb503a4306d841729a7c41490e",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556095.jpg?k=765fdf03aefd1104f8cbc45b12f91997d0e2b0bb503a4306d841729a7c41490e",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/074-a8d1eee306ac879d.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/074-a8d1eee306ac879d.jpg",
      originalSha256:
        "a8d1eee306ac879d80c59731be65b5f94fc35a9c6a2d74af687c35eb03cfaa14",
      servedAssetSha256:
        "a8d1eee306ac879d80c59731be65b5f94fc35a9c6a2d74af687c35eb03cfaa14",
      mediaType: "image/jpeg",
      width: 1024,
      height: 725,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 74,
      detailGalleryOrder: 74,
      alt: "Forest City Marina Hotel property gallery image 74",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-075-ddfa1b5f0bf6",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556145",
      sourceAssetId: "876556145",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556145.jpg?k=13dd7eda2fa9db5253868980763f68a0640d14601fd6101709b2acc35222e36e",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556145.jpg?k=13dd7eda2fa9db5253868980763f68a0640d14601fd6101709b2acc35222e36e",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/075-ddfa1b5f0bf670ef.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/075-ddfa1b5f0bf670ef.jpg",
      originalSha256:
        "ddfa1b5f0bf670ef4641d44efb557f9a416437d188c27008cc3c1e2315c2a3e2",
      servedAssetSha256:
        "ddfa1b5f0bf670ef4641d44efb557f9a416437d188c27008cc3c1e2315c2a3e2",
      mediaType: "image/jpeg",
      width: 576,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 75,
      detailGalleryOrder: 75,
      alt: "Forest City Marina Hotel property gallery image 75",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-076-221499002814",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556170",
      sourceAssetId: "876556170",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556170.jpg?k=37c1dd7fee482000ff5291a54b4b617b26475fada27d8c592b2dc5bcea89187b",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556170.jpg?k=37c1dd7fee482000ff5291a54b4b617b26475fada27d8c592b2dc5bcea89187b",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/076-221499002814b1f9.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/076-221499002814b1f9.jpg",
      originalSha256:
        "221499002814b1f967cb5dd1bfdf6a0bf3042d10218ca3c3bcfc22ce187c6a04",
      servedAssetSha256:
        "221499002814b1f967cb5dd1bfdf6a0bf3042d10218ca3c3bcfc22ce187c6a04",
      mediaType: "image/jpeg",
      width: 1024,
      height: 683,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 76,
      detailGalleryOrder: 76,
      alt: "Forest City Marina Hotel property gallery image 76",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-077-5ed88bee4551",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556181",
      sourceAssetId: "876556181",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556181.jpg?k=5f7ce012c9e1e83b93d5cb39b3b3cd87aad9f2258db1a37dc51d54f4b32172d4",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556181.jpg?k=5f7ce012c9e1e83b93d5cb39b3b3cd87aad9f2258db1a37dc51d54f4b32172d4",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/077-5ed88bee45514d29.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/077-5ed88bee45514d29.jpg",
      originalSha256:
        "5ed88bee45514d299f054ac8cf866d7caac0f33f3f94b3a56fe3ef00da642d2a",
      servedAssetSha256:
        "5ed88bee45514d299f054ac8cf866d7caac0f33f3f94b3a56fe3ef00da642d2a",
      mediaType: "image/jpeg",
      width: 1024,
      height: 660,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 77,
      detailGalleryOrder: 77,
      alt: "Forest City Marina Hotel property gallery image 77",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-078-93cef9fbbbd3",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556217",
      sourceAssetId: "876556217",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556217.jpg?k=73f32efe12fa4ea44db22386e9897ca668b15cf0a5fd2d3d071ceaefaf7a2f60",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556217.jpg?k=73f32efe12fa4ea44db22386e9897ca668b15cf0a5fd2d3d071ceaefaf7a2f60",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/078-93cef9fbbbd3b7c1.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/078-93cef9fbbbd3b7c1.jpg",
      originalSha256:
        "93cef9fbbbd3b7c164e7388e02d1557517bb9415a39f5fc3df91ed7fa1108470",
      servedAssetSha256:
        "93cef9fbbbd3b7c164e7388e02d1557517bb9415a39f5fc3df91ed7fa1108470",
      mediaType: "image/jpeg",
      width: 576,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 78,
      detailGalleryOrder: 78,
      alt: "Forest City Marina Hotel property gallery image 78",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-079-79df8217ad82",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556236",
      sourceAssetId: "876556236",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556236.jpg?k=936e86a4224c197594d7e7dcfbe26ba1962c01925d4db58f764a7a2dc0ab9069",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556236.jpg?k=936e86a4224c197594d7e7dcfbe26ba1962c01925d4db58f764a7a2dc0ab9069",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/079-79df8217ad827e52.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/079-79df8217ad827e52.jpg",
      originalSha256:
        "79df8217ad827e52eb50547b15d5036a110ccef2d3e17d77a420c5bec7a31823",
      servedAssetSha256:
        "79df8217ad827e52eb50547b15d5036a110ccef2d3e17d77a420c5bec7a31823",
      mediaType: "image/jpeg",
      width: 1024,
      height: 633,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 79,
      detailGalleryOrder: 79,
      alt: "Forest City Marina Hotel property gallery image 79",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-080-3cb01414f3f6",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556246",
      sourceAssetId: "876556246",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556246.jpg?k=02b9c4a41421e375e625864fd6cff6f398e6020eb4b0efaf01d2181e1538acb5",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556246.jpg?k=02b9c4a41421e375e625864fd6cff6f398e6020eb4b0efaf01d2181e1538acb5",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/080-3cb01414f3f69fa6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/080-3cb01414f3f69fa6.jpg",
      originalSha256:
        "3cb01414f3f69fa6be80133c72f5ddf01deba9b35087424a0f89b4207faa4154",
      servedAssetSha256:
        "3cb01414f3f69fa6be80133c72f5ddf01deba9b35087424a0f89b4207faa4154",
      mediaType: "image/jpeg",
      width: 1024,
      height: 713,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 80,
      detailGalleryOrder: 80,
      alt: "Forest City Marina Hotel property gallery image 80",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-081-71b9e14137d9",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556274",
      sourceAssetId: "876556274",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556274.jpg?k=ff685ad2c60b84379a7d37dd2fb08fcd351a883bb55c9ef5b36e5bb1431f8df1",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556274.jpg?k=ff685ad2c60b84379a7d37dd2fb08fcd351a883bb55c9ef5b36e5bb1431f8df1",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/081-71b9e14137d99535.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/081-71b9e14137d99535.jpg",
      originalSha256:
        "71b9e14137d99535a62f022ebdf02bab9b8f66a4a671b6821d78353cf2aafac8",
      servedAssetSha256:
        "71b9e14137d99535a62f022ebdf02bab9b8f66a4a671b6821d78353cf2aafac8",
      mediaType: "image/jpeg",
      width: 1024,
      height: 681,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 81,
      detailGalleryOrder: 81,
      alt: "Forest City Marina Hotel property gallery image 81",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-082-f3e4d508d04a",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556299",
      sourceAssetId: "876556299",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556299.jpg?k=408a2c754a6afe3eeda18f8de834d606fa53e31004ea972fc66b6ebc22a7f02f",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556299.jpg?k=408a2c754a6afe3eeda18f8de834d606fa53e31004ea972fc66b6ebc22a7f02f",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/082-f3e4d508d04a90e4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/082-f3e4d508d04a90e4.jpg",
      originalSha256:
        "f3e4d508d04a90e4d6ef0baa27be5ed9724b572bac1d52d390d98344fdec679e",
      servedAssetSha256:
        "f3e4d508d04a90e4d6ef0baa27be5ed9724b572bac1d52d390d98344fdec679e",
      mediaType: "image/jpeg",
      width: 556,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 82,
      detailGalleryOrder: 82,
      alt: "Forest City Marina Hotel property gallery image 82",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-083-d4421176ebb8",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-876556313",
      sourceAssetId: "876556313",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556313.jpg?k=c68ea68b68fe551a34a8ca10b8c814a687e7c5ca176cdeabeb28141425da4a2d",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/876556313.jpg?k=c68ea68b68fe551a34a8ca10b8c814a687e7c5ca176cdeabeb28141425da4a2d",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/083-d4421176ebb8d8d7.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/083-d4421176ebb8d8d7.jpg",
      originalSha256:
        "d4421176ebb8d8d74bdb6953197dfcb9abde1cf8b895c53c99eb0fe3b9ae1349",
      servedAssetSha256:
        "d4421176ebb8d8d74bdb6953197dfcb9abde1cf8b895c53c99eb0fe3b9ae1349",
      mediaType: "image/jpeg",
      width: 1024,
      height: 573,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 83,
      detailGalleryOrder: 83,
      alt: "Forest City Marina Hotel property gallery image 83",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-084-e0284cc32721",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-878927727",
      sourceAssetId: "878927727",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/878927727.jpg?k=3a190fdd0c8e29936f2fe9a0703dd28fc09d351fb4aa0542a66b318fdeecc493",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/878927727.jpg?k=3a190fdd0c8e29936f2fe9a0703dd28fc09d351fb4aa0542a66b318fdeecc493",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/084-e0284cc32721071e.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/084-e0284cc32721071e.jpg",
      originalSha256:
        "e0284cc32721071e15f221ab45ed9c5b5e486dbbd279edbdb1263c0384ec4650",
      servedAssetSha256:
        "e0284cc32721071e15f221ab45ed9c5b5e486dbbd279edbdb1263c0384ec4650",
      mediaType: "image/jpeg",
      width: 1024,
      height: 713,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 84,
      detailGalleryOrder: 84,
      alt: "Forest City Marina Hotel property gallery image 84",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-085-5b79a44d48d7",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-878927827",
      sourceAssetId: "878927827",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/878927827.jpg?k=23cdb15b7d11022347b095a612d1c411aceeac800b1e5a55b7f8d98e72d9b33b",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/878927827.jpg?k=23cdb15b7d11022347b095a612d1c411aceeac800b1e5a55b7f8d98e72d9b33b",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/085-5b79a44d48d7c7ef.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/085-5b79a44d48d7c7ef.jpg",
      originalSha256:
        "5b79a44d48d7c7efb5ea1b116180cd85ba0ce25b477c7480bbe587ab7c2eaef6",
      servedAssetSha256:
        "5b79a44d48d7c7efb5ea1b116180cd85ba0ce25b477c7480bbe587ab7c2eaef6",
      mediaType: "image/jpeg",
      width: 1024,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 85,
      detailGalleryOrder: 85,
      alt: "Forest City Marina Hotel property gallery image 85",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-086-8c155c552caa",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465653",
      sourceAssetId: "902465653",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465653.jpg?k=d720c16bfa134661a0215336b626f0b0726f43e8f6e99904c3f8f479b81b9cc3",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465653.jpg?k=d720c16bfa134661a0215336b626f0b0726f43e8f6e99904c3f8f479b81b9cc3",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/086-8c155c552caa0372.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/086-8c155c552caa0372.jpg",
      originalSha256:
        "8c155c552caa03721a4a9f61ca62b404ecf5745aa1c0664ee05e95e38426228e",
      servedAssetSha256:
        "8c155c552caa03721a4a9f61ca62b404ecf5745aa1c0664ee05e95e38426228e",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 86,
      detailGalleryOrder: 86,
      alt: "Forest City Marina Hotel property gallery image 86",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-087-535034768c38",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465657",
      sourceAssetId: "902465657",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465657.jpg?k=93e515476ae44564d63ad4fe9bd874eafe5cd43d9e327db08a3465afdb39a7f1",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465657.jpg?k=93e515476ae44564d63ad4fe9bd874eafe5cd43d9e327db08a3465afdb39a7f1",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/087-535034768c3806b5.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/087-535034768c3806b5.jpg",
      originalSha256:
        "535034768c3806b57d0feaebfec2b9d093655280671c11c3b8d1086e2a6495b5",
      servedAssetSha256:
        "535034768c3806b57d0feaebfec2b9d093655280671c11c3b8d1086e2a6495b5",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 87,
      detailGalleryOrder: 87,
      alt: "Forest City Marina Hotel property gallery image 87",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-088-7d02582a301d",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465660",
      sourceAssetId: "902465660",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465660.jpg?k=3cb7a9ca78949bd588869a5886e0bf326ee86aa22157dd15b393367fa95ed604",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465660.jpg?k=3cb7a9ca78949bd588869a5886e0bf326ee86aa22157dd15b393367fa95ed604",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/088-7d02582a301da516.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/088-7d02582a301da516.jpg",
      originalSha256:
        "7d02582a301da516e3ad972c9b311ace9ed56c83db7ee93bdd90b8ae7ecec827",
      servedAssetSha256:
        "7d02582a301da516e3ad972c9b311ace9ed56c83db7ee93bdd90b8ae7ecec827",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 88,
      detailGalleryOrder: 88,
      alt: "Forest City Marina Hotel property gallery image 88",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-089-791172567c85",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465666",
      sourceAssetId: "902465666",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465666.jpg?k=49789ed05da5293be10c52d4bbc68b1a330f0d31c8c9b4715866adf13b91829b",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465666.jpg?k=49789ed05da5293be10c52d4bbc68b1a330f0d31c8c9b4715866adf13b91829b",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/089-791172567c851208.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/089-791172567c851208.jpg",
      originalSha256:
        "791172567c8512080c9b339253fe454ae77748adca89dfa84aed28a09a0e4021",
      servedAssetSha256:
        "791172567c8512080c9b339253fe454ae77748adca89dfa84aed28a09a0e4021",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 89,
      detailGalleryOrder: 89,
      alt: "Forest City Marina Hotel property gallery image 89",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-090-38158d609dbb",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465667",
      sourceAssetId: "902465667",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465667.jpg?k=742a5a319c6d6f308299ad64ee440468c671e3727b27817e3620b97a3c79c9d1",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465667.jpg?k=742a5a319c6d6f308299ad64ee440468c671e3727b27817e3620b97a3c79c9d1",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/090-38158d609dbb8c10.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/090-38158d609dbb8c10.jpg",
      originalSha256:
        "38158d609dbb8c1071da885d3c70e7ec8b7dc3888fbef72102abbc85a967d6a8",
      servedAssetSha256:
        "38158d609dbb8c1071da885d3c70e7ec8b7dc3888fbef72102abbc85a967d6a8",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 90,
      detailGalleryOrder: 90,
      alt: "Forest City Marina Hotel property gallery image 90",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-091-893e9ab43f78",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465671",
      sourceAssetId: "902465671",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465671.jpg?k=2be5ba7edb4f90e32a72499b6b064d176bf9697ea350f31b7948513ce35e334f",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465671.jpg?k=2be5ba7edb4f90e32a72499b6b064d176bf9697ea350f31b7948513ce35e334f",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/091-893e9ab43f785ee6.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/091-893e9ab43f785ee6.jpg",
      originalSha256:
        "893e9ab43f785ee66f2a54a0cb782905360a85243a2ae488bc2a217283ca1681",
      servedAssetSha256:
        "893e9ab43f785ee66f2a54a0cb782905360a85243a2ae488bc2a217283ca1681",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 91,
      detailGalleryOrder: 91,
      alt: "Forest City Marina Hotel property gallery image 91",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-092-02ad41c2886e",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465676",
      sourceAssetId: "902465676",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465676.jpg?k=7bdf6c56cf289c902e6ca1d3dd21fea635dc477f9dda78657a053f2cfdb22178",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465676.jpg?k=7bdf6c56cf289c902e6ca1d3dd21fea635dc477f9dda78657a053f2cfdb22178",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/092-02ad41c2886eb1a9.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/092-02ad41c2886eb1a9.jpg",
      originalSha256:
        "02ad41c2886eb1a9fbd50062ff76d2f78018a7e62f02ccb63c3f4a9bd93078c1",
      servedAssetSha256:
        "02ad41c2886eb1a9fbd50062ff76d2f78018a7e62f02ccb63c3f4a9bd93078c1",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 92,
      detailGalleryOrder: 92,
      alt: "Forest City Marina Hotel property gallery image 92",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-093-7029e1098d80",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465679",
      sourceAssetId: "902465679",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465679.jpg?k=b1dcbd49fea219152c637b83e1777b57fec2e467d77836948dc902be7b32aacd",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465679.jpg?k=b1dcbd49fea219152c637b83e1777b57fec2e467d77836948dc902be7b32aacd",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/093-7029e1098d80c433.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/093-7029e1098d80c433.jpg",
      originalSha256:
        "7029e1098d80c4338d05657fbb03b80919adc5bc4739f0d1b28d24c1cd292788",
      servedAssetSha256:
        "7029e1098d80c4338d05657fbb03b80919adc5bc4739f0d1b28d24c1cd292788",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 93,
      detailGalleryOrder: 93,
      alt: "Forest City Marina Hotel property gallery image 93",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-094-b3e3478322c4",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465684",
      sourceAssetId: "902465684",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465684.jpg?k=86aa71bf8d33a3c1e227d69349572e6c5b1bc8b0a0bdab4cdcbcb166cda85b0b",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465684.jpg?k=86aa71bf8d33a3c1e227d69349572e6c5b1bc8b0a0bdab4cdcbcb166cda85b0b",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/094-b3e3478322c4998c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/094-b3e3478322c4998c.jpg",
      originalSha256:
        "b3e3478322c4998ca9c02391377be7db16743d1252b3b1cec6bc6fe43c9cd5c2",
      servedAssetSha256:
        "b3e3478322c4998ca9c02391377be7db16743d1252b3b1cec6bc6fe43c9cd5c2",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 94,
      detailGalleryOrder: 94,
      alt: "Forest City Marina Hotel property gallery image 94",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-095-d63beec3c49f",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465687",
      sourceAssetId: "902465687",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465687.jpg?k=03a4d1479ea4c62d20e6981cdf116419a544002182ca31ea97937c0883a18057",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465687.jpg?k=03a4d1479ea4c62d20e6981cdf116419a544002182ca31ea97937c0883a18057",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/095-d63beec3c49f31e4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/095-d63beec3c49f31e4.jpg",
      originalSha256:
        "d63beec3c49f31e4e8b5c8ce1d79a0bc648476c1f9083c9734a82da1038c79b4",
      servedAssetSha256:
        "d63beec3c49f31e4e8b5c8ce1d79a0bc648476c1f9083c9734a82da1038c79b4",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 95,
      detailGalleryOrder: 95,
      alt: "Forest City Marina Hotel property gallery image 95",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-096-5edb5d5c519c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902465688",
      sourceAssetId: "902465688",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465688.jpg?k=05ad1e14b3b2e5e959a230b2cfdf8ee1d6b1b398e15569a7e0903a95f59398a8",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902465688.jpg?k=05ad1e14b3b2e5e959a230b2cfdf8ee1d6b1b398e15569a7e0903a95f59398a8",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/096-5edb5d5c519cde56.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/096-5edb5d5c519cde56.jpg",
      originalSha256:
        "5edb5d5c519cde567c938506599d1d0b51891042a025dcad10f0b61a5e454461",
      servedAssetSha256:
        "5edb5d5c519cde567c938506599d1d0b51891042a025dcad10f0b61a5e454461",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 96,
      detailGalleryOrder: 96,
      alt: "Forest City Marina Hotel property gallery image 96",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-097-2c11b594ffc7",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723011",
      sourceAssetId: "902723011",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723011.jpg?k=1445f29a20f3a3689f9be53f77ad683bd2ab0a2229062a933628e9ca3bb65823",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723011.jpg?k=1445f29a20f3a3689f9be53f77ad683bd2ab0a2229062a933628e9ca3bb65823",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/097-2c11b594ffc77027.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/097-2c11b594ffc77027.jpg",
      originalSha256:
        "2c11b594ffc77027a8572ae947486b5dc4d1a10012e825574b3776e16917cf39",
      servedAssetSha256:
        "2c11b594ffc77027a8572ae947486b5dc4d1a10012e825574b3776e16917cf39",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 97,
      detailGalleryOrder: 97,
      alt: "Forest City Marina Hotel property gallery image 97",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-098-ecb862ce8eb0",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723014",
      sourceAssetId: "902723014",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723014.jpg?k=bbb8e90144ba6108530c2a91ec27ff057ac954b78afa91e411c24f60cf3adcc1",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723014.jpg?k=bbb8e90144ba6108530c2a91ec27ff057ac954b78afa91e411c24f60cf3adcc1",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/098-ecb862ce8eb008fb.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/098-ecb862ce8eb008fb.jpg",
      originalSha256:
        "ecb862ce8eb008fb59ced759ca81114b588bc1b9cd8de053f4c3349227638d9c",
      servedAssetSha256:
        "ecb862ce8eb008fb59ced759ca81114b588bc1b9cd8de053f4c3349227638d9c",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 98,
      detailGalleryOrder: 98,
      alt: "Forest City Marina Hotel property gallery image 98",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-099-0d4120b739b9",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723016",
      sourceAssetId: "902723016",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723016.jpg?k=ba08a4be31d13eb1e287b6679171799bc329875758836be3837cc27ff642f443",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723016.jpg?k=ba08a4be31d13eb1e287b6679171799bc329875758836be3837cc27ff642f443",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/099-0d4120b739b9608b.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/099-0d4120b739b9608b.jpg",
      originalSha256:
        "0d4120b739b9608b56e43d35ca33416ba0e8b71f80b62cd7b95a51078f4f4923",
      servedAssetSha256:
        "0d4120b739b9608b56e43d35ca33416ba0e8b71f80b62cd7b95a51078f4f4923",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 99,
      detailGalleryOrder: 99,
      alt: "Forest City Marina Hotel property gallery image 99",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-100-e9e8d517e7c1",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723018",
      sourceAssetId: "902723018",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723018.jpg?k=436b25ebca351b4d7c0c4e3a985714a7900dc10f79112ff105e64ea8e5614f12",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723018.jpg?k=436b25ebca351b4d7c0c4e3a985714a7900dc10f79112ff105e64ea8e5614f12",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/100-e9e8d517e7c1b8b5.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/100-e9e8d517e7c1b8b5.jpg",
      originalSha256:
        "e9e8d517e7c1b8b5357a1cd8345d7630b506c57190286578178b724c946edfd6",
      servedAssetSha256:
        "e9e8d517e7c1b8b5357a1cd8345d7630b506c57190286578178b724c946edfd6",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 100,
      detailGalleryOrder: 100,
      alt: "Forest City Marina Hotel property gallery image 100",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-101-c6e8c4f9065c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723019",
      sourceAssetId: "902723019",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723019.jpg?k=1426014acba12d390b2816e7d6f9fc24897ffc0c9b83c264f49d43bcd0e65427",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723019.jpg?k=1426014acba12d390b2816e7d6f9fc24897ffc0c9b83c264f49d43bcd0e65427",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/101-c6e8c4f9065c725e.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/101-c6e8c4f9065c725e.jpg",
      originalSha256:
        "c6e8c4f9065c725e979234ac388374afb702a7f819161b6ad2a0493aba951f00",
      servedAssetSha256:
        "c6e8c4f9065c725e979234ac388374afb702a7f819161b6ad2a0493aba951f00",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 101,
      detailGalleryOrder: 101,
      alt: "Forest City Marina Hotel property gallery image 101",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-102-8f8273d224d5",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723021",
      sourceAssetId: "902723021",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723021.jpg?k=a3ceadb85aaef41479a88a8694870a11b56f18df0108d7deecfc281553476f5e",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723021.jpg?k=a3ceadb85aaef41479a88a8694870a11b56f18df0108d7deecfc281553476f5e",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/102-8f8273d224d53ef5.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/102-8f8273d224d53ef5.jpg",
      originalSha256:
        "8f8273d224d53ef51aeb1bf8c8dc20aff464984f7dd26731f184b023c461fb70",
      servedAssetSha256:
        "8f8273d224d53ef51aeb1bf8c8dc20aff464984f7dd26731f184b023c461fb70",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 102,
      detailGalleryOrder: 102,
      alt: "Forest City Marina Hotel property gallery image 102",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-103-3c6ca41c5265",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723025",
      sourceAssetId: "902723025",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723025.jpg?k=86f80cdb8afca75b6cce37af5641a656e6acfd67bc9aec992ed18b851b1bf3c3",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723025.jpg?k=86f80cdb8afca75b6cce37af5641a656e6acfd67bc9aec992ed18b851b1bf3c3",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/103-3c6ca41c5265ce67.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/103-3c6ca41c5265ce67.jpg",
      originalSha256:
        "3c6ca41c5265ce67672927bcd7f85a1e89b1dd6ca30a32c2538541ce1d67ef3c",
      servedAssetSha256:
        "3c6ca41c5265ce67672927bcd7f85a1e89b1dd6ca30a32c2538541ce1d67ef3c",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 103,
      detailGalleryOrder: 103,
      alt: "Forest City Marina Hotel property gallery image 103",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-104-5c52cab8854b",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723028",
      sourceAssetId: "902723028",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723028.jpg?k=30bea886e9bb9431238c608a5eff1550940b947e13c1a255c6893853725023b0",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723028.jpg?k=30bea886e9bb9431238c608a5eff1550940b947e13c1a255c6893853725023b0",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/104-5c52cab8854be0e9.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/104-5c52cab8854be0e9.jpg",
      originalSha256:
        "5c52cab8854be0e9651abe6f2b5b43418d5c3e17584c79534d0090d87342b3a7",
      servedAssetSha256:
        "5c52cab8854be0e9651abe6f2b5b43418d5c3e17584c79534d0090d87342b3a7",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 104,
      detailGalleryOrder: 104,
      alt: "Forest City Marina Hotel property gallery image 104",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-105-e8fa84013426",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723029",
      sourceAssetId: "902723029",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723029.jpg?k=0aeb7a3eba1cb32c65adfb8fe0e67a47938aac28a062f8321f3a9f11314ac0bf",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723029.jpg?k=0aeb7a3eba1cb32c65adfb8fe0e67a47938aac28a062f8321f3a9f11314ac0bf",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/105-e8fa84013426f379.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/105-e8fa84013426f379.jpg",
      originalSha256:
        "e8fa84013426f379040f1f78cc17c93aa613b3222c274a360f85264658b98732",
      servedAssetSha256:
        "e8fa84013426f379040f1f78cc17c93aa613b3222c274a360f85264658b98732",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 105,
      detailGalleryOrder: 105,
      alt: "Forest City Marina Hotel property gallery image 105",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-106-6a34018fb4a0",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-902723031",
      sourceAssetId: "902723031",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723031.jpg?k=60ff143640ddcc31861b49aeb3ead4d3c70616d6fa26790444d4e52b409e676d",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/902723031.jpg?k=60ff143640ddcc31861b49aeb3ead4d3c70616d6fa26790444d4e52b409e676d",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/106-6a34018fb4a044d8.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/106-6a34018fb4a044d8.jpg",
      originalSha256:
        "6a34018fb4a044d870fbd209f510b5356c19f3c200455d229078d3020b6f5a44",
      servedAssetSha256:
        "6a34018fb4a044d870fbd209f510b5356c19f3c200455d229078d3020b6f5a44",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 106,
      detailGalleryOrder: 106,
      alt: "Forest City Marina Hotel property gallery image 106",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-107-c572a03f64dd",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706140",
      sourceAssetId: "903706140",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706140.jpg?k=95e2a18891fe7935b42389018c12f37617b78c1a9dcf1f447f18dd072c46cdea",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706140.jpg?k=95e2a18891fe7935b42389018c12f37617b78c1a9dcf1f447f18dd072c46cdea",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/107-c572a03f64ddc1ce.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/107-c572a03f64ddc1ce.jpg",
      originalSha256:
        "c572a03f64ddc1cec33598ad5125167fbecc2ae0f7161fbb9f53beb7d02b71d1",
      servedAssetSha256:
        "c572a03f64ddc1cec33598ad5125167fbecc2ae0f7161fbb9f53beb7d02b71d1",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 107,
      detailGalleryOrder: 107,
      alt: "Forest City Marina Hotel property gallery image 107",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-108-0611435b4097",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706142",
      sourceAssetId: "903706142",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706142.jpg?k=bb5b5b28c2df5eeb7f173012eab62b95f2ef4ded622f55af34f7982ada2d8f10",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706142.jpg?k=bb5b5b28c2df5eeb7f173012eab62b95f2ef4ded622f55af34f7982ada2d8f10",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/108-0611435b40977636.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/108-0611435b40977636.jpg",
      originalSha256:
        "0611435b40977636cce6fbfcebf3ff9586486ec56fd16abd8ea20a3ced2f2079",
      servedAssetSha256:
        "0611435b40977636cce6fbfcebf3ff9586486ec56fd16abd8ea20a3ced2f2079",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 108,
      detailGalleryOrder: 108,
      alt: "Forest City Marina Hotel property gallery image 108",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-109-266d92a9de80",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706143",
      sourceAssetId: "903706143",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706143.jpg?k=9ddc426edf140d816c0188ca924b542ae33f3e2e41407a546aa87d4d655a4111",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706143.jpg?k=9ddc426edf140d816c0188ca924b542ae33f3e2e41407a546aa87d4d655a4111",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/109-266d92a9de8054a5.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/109-266d92a9de8054a5.jpg",
      originalSha256:
        "266d92a9de8054a5ddab0389cfd16736833aa4369743e1c252472a038e8105bb",
      servedAssetSha256:
        "266d92a9de8054a5ddab0389cfd16736833aa4369743e1c252472a038e8105bb",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 109,
      detailGalleryOrder: 109,
      alt: "Forest City Marina Hotel property gallery image 109",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-110-50a9d12e0abf",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706145",
      sourceAssetId: "903706145",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706145.jpg?k=52312c5aaa3f2a9617f87863c0c6a3b6facca07e9b1272f49d0d56eacd44497d",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706145.jpg?k=52312c5aaa3f2a9617f87863c0c6a3b6facca07e9b1272f49d0d56eacd44497d",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/110-50a9d12e0abf023d.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/110-50a9d12e0abf023d.jpg",
      originalSha256:
        "50a9d12e0abf023dbc98edeef198e1fe02946d2f3af370b5a81fd7eece3d4a9e",
      servedAssetSha256:
        "50a9d12e0abf023dbc98edeef198e1fe02946d2f3af370b5a81fd7eece3d4a9e",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 110,
      detailGalleryOrder: 110,
      alt: "Forest City Marina Hotel property gallery image 110",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-111-6e823f91cf50",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706146",
      sourceAssetId: "903706146",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706146.jpg?k=00782c436c82744d424b5cd7349aa8b27fcc856517c3466f2a9f52d8147b3427",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706146.jpg?k=00782c436c82744d424b5cd7349aa8b27fcc856517c3466f2a9f52d8147b3427",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/111-6e823f91cf500867.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/111-6e823f91cf500867.jpg",
      originalSha256:
        "6e823f91cf500867dbc8ddf629c845d2e915a1625b3e6dde838453590faf2a7c",
      servedAssetSha256:
        "6e823f91cf500867dbc8ddf629c845d2e915a1625b3e6dde838453590faf2a7c",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 111,
      detailGalleryOrder: 111,
      alt: "Forest City Marina Hotel property gallery image 111",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-112-09c8173fd9ef",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706148",
      sourceAssetId: "903706148",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706148.jpg?k=327160b121d734b4998514cf2359cf1b26eb399c7a152d0f75badc913e16fa4c",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706148.jpg?k=327160b121d734b4998514cf2359cf1b26eb399c7a152d0f75badc913e16fa4c",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/112-09c8173fd9ef9998.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/112-09c8173fd9ef9998.jpg",
      originalSha256:
        "09c8173fd9ef99983418de4c398f839436645e9e4c0677bf3486855ad7e34300",
      servedAssetSha256:
        "09c8173fd9ef99983418de4c398f839436645e9e4c0677bf3486855ad7e34300",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 112,
      detailGalleryOrder: 112,
      alt: "Forest City Marina Hotel property gallery image 112",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-113-9ebf1bfc6597",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706150",
      sourceAssetId: "903706150",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706150.jpg?k=af6f86edc1a36b343ab1b468f61cb107c5b4921c280dfedb32831c52793393aa",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706150.jpg?k=af6f86edc1a36b343ab1b468f61cb107c5b4921c280dfedb32831c52793393aa",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/113-9ebf1bfc6597eb2a.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/113-9ebf1bfc6597eb2a.jpg",
      originalSha256:
        "9ebf1bfc6597eb2a898ad7fa6f56216fe1fc85268fddb098494a00120600440c",
      servedAssetSha256:
        "9ebf1bfc6597eb2a898ad7fa6f56216fe1fc85268fddb098494a00120600440c",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 113,
      detailGalleryOrder: 113,
      alt: "Forest City Marina Hotel property gallery image 113",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-114-4a765990b523",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706152",
      sourceAssetId: "903706152",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706152.jpg?k=7a6e1b3ca5d5c5e4c96eb9c4fc1b7c2d1027b179451ce3596beeb80d2393f57d",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706152.jpg?k=7a6e1b3ca5d5c5e4c96eb9c4fc1b7c2d1027b179451ce3596beeb80d2393f57d",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/114-4a765990b5234b04.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/114-4a765990b5234b04.jpg",
      originalSha256:
        "4a765990b5234b043b68a7fc70184d5ab812eaef8957421c6370de8fc0c94a41",
      servedAssetSha256:
        "4a765990b5234b043b68a7fc70184d5ab812eaef8957421c6370de8fc0c94a41",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 114,
      detailGalleryOrder: 114,
      alt: "Forest City Marina Hotel property gallery image 114",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-115-31408317d084",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706161",
      sourceAssetId: "903706161",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706161.jpg?k=a6754fc8bb2fb920d32b219a350df3c010330c5010d390f1cbef1541f6e7a635",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706161.jpg?k=a6754fc8bb2fb920d32b219a350df3c010330c5010d390f1cbef1541f6e7a635",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/115-31408317d084c42b.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/115-31408317d084c42b.jpg",
      originalSha256:
        "31408317d084c42ba43923edc4901912077598ec175908ac110839d3127c09d1",
      servedAssetSha256:
        "31408317d084c42ba43923edc4901912077598ec175908ac110839d3127c09d1",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 115,
      detailGalleryOrder: 115,
      alt: "Forest City Marina Hotel property gallery image 115",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-116-46965962b76c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706164",
      sourceAssetId: "903706164",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706164.jpg?k=e8510938e2ae7faf582e76a0660c2e80b9589359e1f8ecd267e9a3e15b076814",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706164.jpg?k=e8510938e2ae7faf582e76a0660c2e80b9589359e1f8ecd267e9a3e15b076814",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/116-46965962b76c3f34.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/116-46965962b76c3f34.jpg",
      originalSha256:
        "46965962b76c3f3413665043e8085ee165b3abae65e525b31729810d5158ad90",
      servedAssetSha256:
        "46965962b76c3f3413665043e8085ee165b3abae65e525b31729810d5158ad90",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 116,
      detailGalleryOrder: 116,
      alt: "Forest City Marina Hotel property gallery image 116",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-117-bb8d7e065e10",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706166",
      sourceAssetId: "903706166",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706166.jpg?k=8d90ae927aa6e6a7ddd257a68120eed77b7842eacefd467fe7bd479f2d943168",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706166.jpg?k=8d90ae927aa6e6a7ddd257a68120eed77b7842eacefd467fe7bd479f2d943168",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/117-bb8d7e065e10dd1c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/117-bb8d7e065e10dd1c.jpg",
      originalSha256:
        "bb8d7e065e10dd1c07088034bc0d318947b531ed202482a1ec9318b3f2314c64",
      servedAssetSha256:
        "bb8d7e065e10dd1c07088034bc0d318947b531ed202482a1ec9318b3f2314c64",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 117,
      detailGalleryOrder: 117,
      alt: "Forest City Marina Hotel property gallery image 117",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-118-05690e8d2d0e",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706168",
      sourceAssetId: "903706168",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706168.jpg?k=6380ec158c24a95fa8e208f0cee5181282ff48cfe1165a786c876ea14fd42781",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706168.jpg?k=6380ec158c24a95fa8e208f0cee5181282ff48cfe1165a786c876ea14fd42781",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/118-05690e8d2d0e81a0.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/118-05690e8d2d0e81a0.jpg",
      originalSha256:
        "05690e8d2d0e81a02a8f450698c5eb9cedd666583f560b617939e5b6dc041962",
      servedAssetSha256:
        "05690e8d2d0e81a02a8f450698c5eb9cedd666583f560b617939e5b6dc041962",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 118,
      detailGalleryOrder: 118,
      alt: "Forest City Marina Hotel property gallery image 118",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-119-d95831b0c96e",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706172",
      sourceAssetId: "903706172",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706172.jpg?k=de5966bed9ac5bc6717d6fe1da7520df9288eca5d99216a0d55a8f89be1eb251",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706172.jpg?k=de5966bed9ac5bc6717d6fe1da7520df9288eca5d99216a0d55a8f89be1eb251",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/119-d95831b0c96ec9c8.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/119-d95831b0c96ec9c8.jpg",
      originalSha256:
        "d95831b0c96ec9c80b4a8e602ee5ea0c09469a66dcb3ae3892cfb20e75439526",
      servedAssetSha256:
        "d95831b0c96ec9c80b4a8e602ee5ea0c09469a66dcb3ae3892cfb20e75439526",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 119,
      detailGalleryOrder: 119,
      alt: "Forest City Marina Hotel property gallery image 119",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-120-ad505fcb6343",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706173",
      sourceAssetId: "903706173",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706173.jpg?k=dfcb9412dc56042ec76a2b5c263e596252a3b0b5ca86cf62098e34a60fce07f5",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706173.jpg?k=dfcb9412dc56042ec76a2b5c263e596252a3b0b5ca86cf62098e34a60fce07f5",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/120-ad505fcb63431834.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/120-ad505fcb63431834.jpg",
      originalSha256:
        "ad505fcb63431834cf8fc30b16e6bdb78c667fa8c0af0dd41dd016cf6e37abe2",
      servedAssetSha256:
        "ad505fcb63431834cf8fc30b16e6bdb78c667fa8c0af0dd41dd016cf6e37abe2",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 120,
      detailGalleryOrder: 120,
      alt: "Forest City Marina Hotel property gallery image 120",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-121-edc2ec9e48cb",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706176",
      sourceAssetId: "903706176",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706176.jpg?k=8540072b3d213eae6325aac0acd8b6282ca3684e084d031185dad69ab6169602",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706176.jpg?k=8540072b3d213eae6325aac0acd8b6282ca3684e084d031185dad69ab6169602",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/121-edc2ec9e48cbe7d4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/121-edc2ec9e48cbe7d4.jpg",
      originalSha256:
        "edc2ec9e48cbe7d42a18f0fb9540bbd236a09f120e3469bceaef2252014b583c",
      servedAssetSha256:
        "edc2ec9e48cbe7d42a18f0fb9540bbd236a09f120e3469bceaef2252014b583c",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 121,
      detailGalleryOrder: 121,
      alt: "Forest City Marina Hotel property gallery image 121",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-122-2bd72871ce58",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706178",
      sourceAssetId: "903706178",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706178.jpg?k=0e62c03f568fd8acb931c69a4ab38672bd5a138f3e16ecafbbda944b99861751",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706178.jpg?k=0e62c03f568fd8acb931c69a4ab38672bd5a138f3e16ecafbbda944b99861751",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/122-2bd72871ce580152.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/122-2bd72871ce580152.jpg",
      originalSha256:
        "2bd72871ce580152712c340ee3ef0c55712962560dbbb79456966784c2d2796f",
      servedAssetSha256:
        "2bd72871ce580152712c340ee3ef0c55712962560dbbb79456966784c2d2796f",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 122,
      detailGalleryOrder: 122,
      alt: "Forest City Marina Hotel property gallery image 122",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-123-35a5b329ca05",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706180",
      sourceAssetId: "903706180",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706180.jpg?k=0a18d0ebe84c77ce4b97637f234738c1bca4536dc9139cae1b4f9819ec1054a8",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706180.jpg?k=0a18d0ebe84c77ce4b97637f234738c1bca4536dc9139cae1b4f9819ec1054a8",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/123-35a5b329ca05bb9f.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/123-35a5b329ca05bb9f.jpg",
      originalSha256:
        "35a5b329ca05bb9ffc4a01ceb4d07083bdb936c1f977589ee32f7a7b88c9f0b4",
      servedAssetSha256:
        "35a5b329ca05bb9ffc4a01ceb4d07083bdb936c1f977589ee32f7a7b88c9f0b4",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 123,
      detailGalleryOrder: 123,
      alt: "Forest City Marina Hotel property gallery image 123",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-124-35995d51fecd",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706182",
      sourceAssetId: "903706182",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706182.jpg?k=1ffabc510ab0c9172513aa5026698f4bb12daabe33029c05ee85c10d2cae1e55",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706182.jpg?k=1ffabc510ab0c9172513aa5026698f4bb12daabe33029c05ee85c10d2cae1e55",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/124-35995d51fecd3855.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/124-35995d51fecd3855.jpg",
      originalSha256:
        "35995d51fecd3855602a1a96ddabdb57730de458c9c86d56aafcffcff6f91a95",
      servedAssetSha256:
        "35995d51fecd3855602a1a96ddabdb57730de458c9c86d56aafcffcff6f91a95",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 124,
      detailGalleryOrder: 124,
      alt: "Forest City Marina Hotel property gallery image 124",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-125-52cac1507bf1",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706183",
      sourceAssetId: "903706183",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706183.jpg?k=ecaa8b1bae159cdcfea58235c960cf4878b789734e923392611e3ef9f869f496",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706183.jpg?k=ecaa8b1bae159cdcfea58235c960cf4878b789734e923392611e3ef9f869f496",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/125-52cac1507bf16573.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/125-52cac1507bf16573.jpg",
      originalSha256:
        "52cac1507bf165731005c02bbb0facda7b02c9eac8afbb253e2d99e0a73ed0d2",
      servedAssetSha256:
        "52cac1507bf165731005c02bbb0facda7b02c9eac8afbb253e2d99e0a73ed0d2",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 125,
      detailGalleryOrder: 125,
      alt: "Forest City Marina Hotel property gallery image 125",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-126-0bf93c557f85",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706185",
      sourceAssetId: "903706185",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706185.jpg?k=0db0ef6447d1854d07ff048ed9499f579aac3cb725a8eaac583dfff6fc37c269",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706185.jpg?k=0db0ef6447d1854d07ff048ed9499f579aac3cb725a8eaac583dfff6fc37c269",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/126-0bf93c557f853faf.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/126-0bf93c557f853faf.jpg",
      originalSha256:
        "0bf93c557f853faf53211893ff6efbafef4b4678a68b2100d72a7a89822de780",
      servedAssetSha256:
        "0bf93c557f853faf53211893ff6efbafef4b4678a68b2100d72a7a89822de780",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 126,
      detailGalleryOrder: 126,
      alt: "Forest City Marina Hotel property gallery image 126",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-127-6b630a609a2a",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706188",
      sourceAssetId: "903706188",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706188.jpg?k=9e101ab965ff051f078d78b521e7a81d389227421352ec5a9a6c0bc22c39da09",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706188.jpg?k=9e101ab965ff051f078d78b521e7a81d389227421352ec5a9a6c0bc22c39da09",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/127-6b630a609a2aa4cf.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/127-6b630a609a2aa4cf.jpg",
      originalSha256:
        "6b630a609a2aa4cfea82ec1f3ba6417045af43cca769c120d29771c6715aca99",
      servedAssetSha256:
        "6b630a609a2aa4cfea82ec1f3ba6417045af43cca769c120d29771c6715aca99",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 127,
      detailGalleryOrder: 127,
      alt: "Forest City Marina Hotel property gallery image 127",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-128-0559fc151fa2",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706191",
      sourceAssetId: "903706191",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706191.jpg?k=1022b3d28811eb0b74ab1601091ecf01bab21dd65943646b4d3413bbf6b1e3d9",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706191.jpg?k=1022b3d28811eb0b74ab1601091ecf01bab21dd65943646b4d3413bbf6b1e3d9",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/128-0559fc151fa2cb58.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/128-0559fc151fa2cb58.jpg",
      originalSha256:
        "0559fc151fa2cb585a6452d2687239f9e260e15ecf59d11f9c502e98f2cf23ae",
      servedAssetSha256:
        "0559fc151fa2cb585a6452d2687239f9e260e15ecf59d11f9c502e98f2cf23ae",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 128,
      detailGalleryOrder: 128,
      alt: "Forest City Marina Hotel property gallery image 128",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-129-40ba523239f3",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-903706193",
      sourceAssetId: "903706193",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706193.jpg?k=1e38b23ebc8787abc61c3eaaa328d5dd13af40a70e6d21999f31d998de5dff8c",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/903706193.jpg?k=1e38b23ebc8787abc61c3eaaa328d5dd13af40a70e6d21999f31d998de5dff8c",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/129-40ba523239f31a3a.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/129-40ba523239f31a3a.jpg",
      originalSha256:
        "40ba523239f31a3a71dae1ad0a3d968df6db4c2c1709da4da2d84b4b2b8ee8af",
      servedAssetSha256:
        "40ba523239f31a3a71dae1ad0a3d968df6db4c2c1709da4da2d84b4b2b8ee8af",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 129,
      detailGalleryOrder: 129,
      alt: "Forest City Marina Hotel property gallery image 129",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-130-951d98baaaf1",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-904903998",
      sourceAssetId: "904903998",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904903998.jpg?k=841e93e5d644508b9d7febf005693bcee71a319660bdf154f02ecabdb1e421d7",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904903998.jpg?k=841e93e5d644508b9d7febf005693bcee71a319660bdf154f02ecabdb1e421d7",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/130-951d98baaaf1d613.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/130-951d98baaaf1d613.jpg",
      originalSha256:
        "951d98baaaf1d613ccb6deb84feeacbe51af7a2346ddb91d813d5f2dde7c5c0b",
      servedAssetSha256:
        "951d98baaaf1d613ccb6deb84feeacbe51af7a2346ddb91d813d5f2dde7c5c0b",
      mediaType: "image/jpeg",
      width: 1024,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 130,
      detailGalleryOrder: 130,
      alt: "Forest City Marina Hotel property gallery image 130",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-131-0948fcaabc4f",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-904904011",
      sourceAssetId: "904904011",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904011.jpg?k=ad7eb8fb60cc597d87876bf4c4bd0f2336ae774df90b07562195ce74aba68d6a",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904011.jpg?k=ad7eb8fb60cc597d87876bf4c4bd0f2336ae774df90b07562195ce74aba68d6a",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/131-0948fcaabc4f9df2.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/131-0948fcaabc4f9df2.jpg",
      originalSha256:
        "0948fcaabc4f9df255df8e35fcef3718b69c4c7a0186f0d51408c23f77b3002e",
      servedAssetSha256:
        "0948fcaabc4f9df255df8e35fcef3718b69c4c7a0186f0d51408c23f77b3002e",
      mediaType: "image/jpeg",
      width: 1024,
      height: 682,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 131,
      detailGalleryOrder: 131,
      alt: "Forest City Marina Hotel property gallery image 131",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-132-5a3009abafc3",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-904904013",
      sourceAssetId: "904904013",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904013.jpg?k=2a8aa14b23ccf86b5890f6f9d7d73ae97316d8c9c836c26a497961315da03c47",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904013.jpg?k=2a8aa14b23ccf86b5890f6f9d7d73ae97316d8c9c836c26a497961315da03c47",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/132-5a3009abafc314d4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/132-5a3009abafc314d4.jpg",
      originalSha256:
        "5a3009abafc314d4d3c3b4071f358809623305c21b9e0e84eb471a0e63e2d49c",
      servedAssetSha256:
        "5a3009abafc314d4d3c3b4071f358809623305c21b9e0e84eb471a0e63e2d49c",
      mediaType: "image/jpeg",
      width: 1024,
      height: 662,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 132,
      detailGalleryOrder: 132,
      alt: "Forest City Marina Hotel property gallery image 132",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-133-43c5bfc8fc0d",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-904904015",
      sourceAssetId: "904904015",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904015.jpg?k=b6c40be58a3a6e98acad46c61c8730441d00f9e7396ac27bb21e1beced9bce82",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904015.jpg?k=b6c40be58a3a6e98acad46c61c8730441d00f9e7396ac27bb21e1beced9bce82",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/133-43c5bfc8fc0d8bb7.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/133-43c5bfc8fc0d8bb7.jpg",
      originalSha256:
        "43c5bfc8fc0d8bb7fb64a657a938ea89460f47ca2665da066f6f603fd40726ed",
      servedAssetSha256:
        "43c5bfc8fc0d8bb7fb64a657a938ea89460f47ca2665da066f6f603fd40726ed",
      mediaType: "image/jpeg",
      width: 512,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 133,
      detailGalleryOrder: 133,
      alt: "Forest City Marina Hotel property gallery image 133",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-134-3163fbd3c7e9",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-904904029",
      sourceAssetId: "904904029",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904029.jpg?k=979274cfb353a6241bfbed14ff230a32629f6c3da937eff7f6b16f0199b35944",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/904904029.jpg?k=979274cfb353a6241bfbed14ff230a32629f6c3da937eff7f6b16f0199b35944",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/134-3163fbd3c7e943e2.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/134-3163fbd3c7e943e2.jpg",
      originalSha256:
        "3163fbd3c7e943e217a727fd1526f4c2e0070c6ddf7ef07851aa4a9392df6b56",
      servedAssetSha256:
        "3163fbd3c7e943e217a727fd1526f4c2e0070c6ddf7ef07851aa4a9392df6b56",
      mediaType: "image/jpeg",
      width: 576,
      height: 768,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 134,
      detailGalleryOrder: 134,
      alt: "Forest City Marina Hotel property gallery image 134",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-135-e9b604f0782a",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251450",
      sourceAssetId: "905251450",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251450.jpg?k=b27bd75d5a506bb4344a7ef786ae4181be6040bb63eac0655e604ae7b5a6b618",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251450.jpg?k=b27bd75d5a506bb4344a7ef786ae4181be6040bb63eac0655e604ae7b5a6b618",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/135-e9b604f0782ad0d4.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/135-e9b604f0782ad0d4.jpg",
      originalSha256:
        "e9b604f0782ad0d47e7838796a1fb2b1afe75d4dedd1cf3d2b19cc7c1b232062",
      servedAssetSha256:
        "e9b604f0782ad0d47e7838796a1fb2b1afe75d4dedd1cf3d2b19cc7c1b232062",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 135,
      detailGalleryOrder: 135,
      alt: "Forest City Marina Hotel property gallery image 135",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-136-60cc45c7f3a9",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251456",
      sourceAssetId: "905251456",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251456.jpg?k=01090f605440af0ca15d6da2e42285175c3678272c96876e521e530c25c4d8e9",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251456.jpg?k=01090f605440af0ca15d6da2e42285175c3678272c96876e521e530c25c4d8e9",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/136-60cc45c7f3a9b090.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/136-60cc45c7f3a9b090.jpg",
      originalSha256:
        "60cc45c7f3a9b09071c8fad4f1396bb5721b17a1ccf95fad4bc61e51e1690d1f",
      servedAssetSha256:
        "60cc45c7f3a9b09071c8fad4f1396bb5721b17a1ccf95fad4bc61e51e1690d1f",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 136,
      detailGalleryOrder: 136,
      alt: "Forest City Marina Hotel property gallery image 136",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-137-81c27b90f87c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251460",
      sourceAssetId: "905251460",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251460.jpg?k=d47a0f6c4fc793a0c9c7b25b49027cd26a46af3daa060d1d50909e25bedb9ae0",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251460.jpg?k=d47a0f6c4fc793a0c9c7b25b49027cd26a46af3daa060d1d50909e25bedb9ae0",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/137-81c27b90f87ca78d.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/137-81c27b90f87ca78d.jpg",
      originalSha256:
        "81c27b90f87ca78d2c9e926a907b6f20fb47dbdbe3950dd30c3c6d733578ccea",
      servedAssetSha256:
        "81c27b90f87ca78d2c9e926a907b6f20fb47dbdbe3950dd30c3c6d733578ccea",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 137,
      detailGalleryOrder: 137,
      alt: "Forest City Marina Hotel property gallery image 137",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-138-24b799b88496",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251462",
      sourceAssetId: "905251462",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251462.jpg?k=25648fd6b9152eda31f0f3873a3c2398062c5db5e823cd1af8c3093fa409962a",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251462.jpg?k=25648fd6b9152eda31f0f3873a3c2398062c5db5e823cd1af8c3093fa409962a",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/138-24b799b884962267.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/138-24b799b884962267.jpg",
      originalSha256:
        "24b799b884962267c254c4a9d5e430ca286dcca7966c6494b6d3264c15da28c4",
      servedAssetSha256:
        "24b799b884962267c254c4a9d5e430ca286dcca7966c6494b6d3264c15da28c4",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 138,
      detailGalleryOrder: 138,
      alt: "Forest City Marina Hotel property gallery image 138",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-139-0a8921fbf4fd",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251475",
      sourceAssetId: "905251475",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251475.jpg?k=e5adc7b18281f4b52addac771d865eef17dd4fb12d8ec5f960c623b317576f50",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251475.jpg?k=e5adc7b18281f4b52addac771d865eef17dd4fb12d8ec5f960c623b317576f50",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/139-0a8921fbf4fd811f.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/139-0a8921fbf4fd811f.jpg",
      originalSha256:
        "0a8921fbf4fd811f2fe75d1676f077b1752b4674358927c024955820543f6311",
      servedAssetSha256:
        "0a8921fbf4fd811f2fe75d1676f077b1752b4674358927c024955820543f6311",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 139,
      detailGalleryOrder: 139,
      alt: "Forest City Marina Hotel property gallery image 139",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-140-94feaf252b2e",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251493",
      sourceAssetId: "905251493",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251493.jpg?k=e5621f277cad832218aa07821814ac0a685c82c41e9b0c4903808e8362586682",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251493.jpg?k=e5621f277cad832218aa07821814ac0a685c82c41e9b0c4903808e8362586682",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/140-94feaf252b2eaa40.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/140-94feaf252b2eaa40.jpg",
      originalSha256:
        "94feaf252b2eaa4099f69c97beb4823745a5041a6103a2a11db5533b8b71b09e",
      servedAssetSha256:
        "94feaf252b2eaa4099f69c97beb4823745a5041a6103a2a11db5533b8b71b09e",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 140,
      detailGalleryOrder: 140,
      alt: "Forest City Marina Hotel property gallery image 140",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-141-17b60d662bf5",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251495",
      sourceAssetId: "905251495",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251495.jpg?k=1d8b7c677cd93fd9abb3136479a0458e4b3974e8f631d6c5bce4dbc83bf8f938",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251495.jpg?k=1d8b7c677cd93fd9abb3136479a0458e4b3974e8f631d6c5bce4dbc83bf8f938",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/141-17b60d662bf59087.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/141-17b60d662bf59087.jpg",
      originalSha256:
        "17b60d662bf59087f87ba872adaa0c87bd24c80497d0dcaa5173dda71082d925",
      servedAssetSha256:
        "17b60d662bf59087f87ba872adaa0c87bd24c80497d0dcaa5173dda71082d925",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 141,
      detailGalleryOrder: 141,
      alt: "Forest City Marina Hotel property gallery image 141",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-142-3a8f4a506eed",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251498",
      sourceAssetId: "905251498",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251498.jpg?k=34d83e4f6bad3dd774f15788d3fe656d2022552b69bfa5c42a4bcfa0b0e817a0",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251498.jpg?k=34d83e4f6bad3dd774f15788d3fe656d2022552b69bfa5c42a4bcfa0b0e817a0",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/142-3a8f4a506eed2f01.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/142-3a8f4a506eed2f01.jpg",
      originalSha256:
        "3a8f4a506eed2f0129e44f622c093017e7ece89ee7e4654995a1ac631cf18ef5",
      servedAssetSha256:
        "3a8f4a506eed2f0129e44f622c093017e7ece89ee7e4654995a1ac631cf18ef5",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 142,
      detailGalleryOrder: 142,
      alt: "Forest City Marina Hotel property gallery image 142",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-143-f5bbb902b7a5",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251508",
      sourceAssetId: "905251508",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251508.jpg?k=b731a64e23c0c2be39ce51d28313373e4a45a2fa2e475a3416baccad951e386b",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251508.jpg?k=b731a64e23c0c2be39ce51d28313373e4a45a2fa2e475a3416baccad951e386b",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/143-f5bbb902b7a57edd.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/143-f5bbb902b7a57edd.jpg",
      originalSha256:
        "f5bbb902b7a57edd7e06f1a1194aa929fd8b48cd814ff5fb83840ac760835da5",
      servedAssetSha256:
        "f5bbb902b7a57edd7e06f1a1194aa929fd8b48cd814ff5fb83840ac760835da5",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 143,
      detailGalleryOrder: 143,
      alt: "Forest City Marina Hotel property gallery image 143",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-144-787343740a23",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251517",
      sourceAssetId: "905251517",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251517.jpg?k=789715466a3d5cfcfba04dbef952362fee38d9a4307f1dd445d23ae8aca5c849",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251517.jpg?k=789715466a3d5cfcfba04dbef952362fee38d9a4307f1dd445d23ae8aca5c849",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/144-787343740a235964.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/144-787343740a235964.jpg",
      originalSha256:
        "787343740a23596414a29bdc29c9e8f0d9552e53cbaaa790baa03b92634d0f97",
      servedAssetSha256:
        "787343740a23596414a29bdc29c9e8f0d9552e53cbaaa790baa03b92634d0f97",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 144,
      detailGalleryOrder: 144,
      alt: "Forest City Marina Hotel property gallery image 144",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-145-0688c7427654",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251519",
      sourceAssetId: "905251519",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251519.jpg?k=cc2cc3f36b312fb8052c7e6c4daa71d809fb0ff996cd549cb58f6a9fd14eaa52",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251519.jpg?k=cc2cc3f36b312fb8052c7e6c4daa71d809fb0ff996cd549cb58f6a9fd14eaa52",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/145-0688c7427654a40c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/145-0688c7427654a40c.jpg",
      originalSha256:
        "0688c7427654a40c6250a9cdd945d917082ec6606ed2e230e0a4eb198ca6e97b",
      servedAssetSha256:
        "0688c7427654a40c6250a9cdd945d917082ec6606ed2e230e0a4eb198ca6e97b",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 145,
      detailGalleryOrder: 145,
      alt: "Forest City Marina Hotel property gallery image 145",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-146-5a7f6a70928b",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251524",
      sourceAssetId: "905251524",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251524.jpg?k=1fe65bac18718e3f500b676e86b72fdbdc3781a1b73045d6effefae6f16449a6",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251524.jpg?k=1fe65bac18718e3f500b676e86b72fdbdc3781a1b73045d6effefae6f16449a6",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/146-5a7f6a70928b6814.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/146-5a7f6a70928b6814.jpg",
      originalSha256:
        "5a7f6a70928b68140e3ad790f55cbede01b8bef294f6efc14642f0b4c95fcf49",
      servedAssetSha256:
        "5a7f6a70928b68140e3ad790f55cbede01b8bef294f6efc14642f0b4c95fcf49",
      mediaType: "image/jpeg",
      width: 1024,
      height: 458,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 146,
      detailGalleryOrder: 146,
      alt: "Forest City Marina Hotel property gallery image 146",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-147-d475998620c8",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251525",
      sourceAssetId: "905251525",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251525.jpg?k=7777d551a817cf5f951af9fcfc2446046ac3d628342e54d6a4b4a9ae5b30a2f7",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251525.jpg?k=7777d551a817cf5f951af9fcfc2446046ac3d628342e54d6a4b4a9ae5b30a2f7",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/147-d475998620c8bccf.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/147-d475998620c8bccf.jpg",
      originalSha256:
        "d475998620c8bccfef50895e32528eed7070f03fec51cea40f1a888f5db577b8",
      servedAssetSha256:
        "d475998620c8bccfef50895e32528eed7070f03fec51cea40f1a888f5db577b8",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 147,
      detailGalleryOrder: 147,
      alt: "Forest City Marina Hotel property gallery image 147",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-148-6cd0f81c8e95",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251527",
      sourceAssetId: "905251527",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251527.jpg?k=6d3abd69b93860f61725673c832dc992d81ec37bfac17ff87d2370ccf563fcea",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251527.jpg?k=6d3abd69b93860f61725673c832dc992d81ec37bfac17ff87d2370ccf563fcea",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/148-6cd0f81c8e958919.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/148-6cd0f81c8e958919.jpg",
      originalSha256:
        "6cd0f81c8e95891915f8cb1df16372be345d4a567de8a03d91ff7bb9fe472fff",
      servedAssetSha256:
        "6cd0f81c8e95891915f8cb1df16372be345d4a567de8a03d91ff7bb9fe472fff",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 148,
      detailGalleryOrder: 148,
      alt: "Forest City Marina Hotel property gallery image 148",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-149-ab776bdd4ff2",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251529",
      sourceAssetId: "905251529",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251529.jpg?k=4ccb656c6f4764987dc2fb0678db36c4da831b63409009e904ed857fb6411b57",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251529.jpg?k=4ccb656c6f4764987dc2fb0678db36c4da831b63409009e904ed857fb6411b57",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/149-ab776bdd4ff2448c.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/149-ab776bdd4ff2448c.jpg",
      originalSha256:
        "ab776bdd4ff2448ccd78359c7836ec1514336d29b68b6bc30ebd54ce66667e56",
      servedAssetSha256:
        "ab776bdd4ff2448ccd78359c7836ec1514336d29b68b6bc30ebd54ce66667e56",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 149,
      detailGalleryOrder: 149,
      alt: "Forest City Marina Hotel property gallery image 149",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-150-1b75a3c63a7c",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251537",
      sourceAssetId: "905251537",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251537.jpg?k=9e21b58cb6c287adb7682171abb7ffb15464dd7b4f1aa73b477bd6462f2887f3",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251537.jpg?k=9e21b58cb6c287adb7682171abb7ffb15464dd7b4f1aa73b477bd6462f2887f3",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/150-1b75a3c63a7c865e.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/150-1b75a3c63a7c865e.jpg",
      originalSha256:
        "1b75a3c63a7c865e3097931ee91c1a4ee7aa77a376b8d86b6b435b0a06ccd522",
      servedAssetSha256:
        "1b75a3c63a7c865e3097931ee91c1a4ee7aa77a376b8d86b6b435b0a06ccd522",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 150,
      detailGalleryOrder: 150,
      alt: "Forest City Marina Hotel property gallery image 150",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-151-c946fd8041d6",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251542",
      sourceAssetId: "905251542",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251542.jpg?k=5c604c5e736755c568fc4875f83b9eba271f25e4fa04ebc198b6e6068deb8634",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251542.jpg?k=5c604c5e736755c568fc4875f83b9eba271f25e4fa04ebc198b6e6068deb8634",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/151-c946fd8041d6f64e.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/151-c946fd8041d6f64e.jpg",
      originalSha256:
        "c946fd8041d6f64e928e561ef469580f65ba697780ae405797f012be9c957e59",
      servedAssetSha256:
        "c946fd8041d6f64e928e561ef469580f65ba697780ae405797f012be9c957e59",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 151,
      detailGalleryOrder: 151,
      alt: "Forest City Marina Hotel property gallery image 151",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-152-f2b067a60497",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251544",
      sourceAssetId: "905251544",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251544.jpg?k=8cc8aa5a8bc59731a5b7903a42fc2ee60a9b6434ae22b1365913ff2190ac6665",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251544.jpg?k=8cc8aa5a8bc59731a5b7903a42fc2ee60a9b6434ae22b1365913ff2190ac6665",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/152-f2b067a604974bcc.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/152-f2b067a604974bcc.jpg",
      originalSha256:
        "f2b067a604974bccb7dba1262e99901c961312565bbf58148e06a783bcd2dc4a",
      servedAssetSha256:
        "f2b067a604974bccb7dba1262e99901c961312565bbf58148e06a783bcd2dc4a",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 152,
      detailGalleryOrder: 152,
      alt: "Forest City Marina Hotel property gallery image 152",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-153-aa355002ac35",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251548",
      sourceAssetId: "905251548",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251548.jpg?k=3165e452c9ed6713413dbec03a6be29e63e45cdb2f8bc8d093b82c0672ea75a5",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251548.jpg?k=3165e452c9ed6713413dbec03a6be29e63e45cdb2f8bc8d093b82c0672ea75a5",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/153-aa355002ac35bf48.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/153-aa355002ac35bf48.jpg",
      originalSha256:
        "aa355002ac35bf48d892fc4d7de3de9dc08b3287ad181a5b2a57e06c6281b6de",
      servedAssetSha256:
        "aa355002ac35bf48d892fc4d7de3de9dc08b3287ad181a5b2a57e06c6281b6de",
      mediaType: "image/jpeg",
      width: 1024,
      height: 682,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 153,
      detailGalleryOrder: 153,
      alt: "Forest City Marina Hotel property gallery image 153",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
    {
      id: "marina-gallery-154-cb285d5359bf",
      propertyId: "property-clubs-forest-city-marina",
      sourceFamily: "booking_com_partner_property_media",
      sourceEvidenceId: "booking-property-photo-905251555",
      sourceAssetId: "905251555",
      sourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251555.jpg?k=0a81a393885f459dd028b4eb17d43a274d938e57a8129c22f2f2928fe32f16c1",
      finalSourceUrl:
        "https://cf.bstatic.com/xdata/images/hotel/max1024x768/905251555.jpg?k=0a81a393885f459dd028b4eb17d43a274d938e57a8129c22f2f2928fe32f16c1",
      observedAt: "2026-08-28",
      authority: "owner_authorized_booking_com_partner_media",
      licenseReceiptId:
        "CCLUB-V2552-BOOKING-COM-PARTNER-MEDIA-OWNER-AUTH-2026-08-28",
      originalAsset:
        "public/__crays-clubs/forest-city-v2552/marina/154-cb285d5359bf9f29.jpg",
      publicPath:
        "/__crays-clubs/forest-city-v2552/marina/154-cb285d5359bf9f29.jpg",
      originalSha256:
        "cb285d5359bf9f2970769d6c81e7bf899f80c9f6df99f10e2c5210540f3af228",
      servedAssetSha256:
        "cb285d5359bf9f2970769d6c81e7bf899f80c9f6df99f10e2c5210540f3af228",
      mediaType: "image/jpeg",
      width: 840,
      height: 460,
      placement: "gallery_supporting",
      searchPlacement: null,
      galleryGroup: "Property gallery",
      galleryOrder: 154,
      detailGalleryOrder: 154,
      alt: "Forest City Marina Hotel property gallery image 154",
      focalPoint: {
        x: 0.5,
        y: 0.5,
      },
      crop: "cover",
      rightsStatus: "admitted",
      renderable: true,
      hotlinkAllowed: false,
      rehostingAllowed: true,
      admissionState: "admitted_owner_authorized_source_bound",
      canonicalRoomTypeId: null,
      bookable: false,
      usageQualifier:
        "property_and_search_media_no_canonical_room_or_booking_binding",
    },
  ],
} as const satisfies Record<
  ForestCityContentPropertyId,
  readonly ForestCityAdmittedMedia[]
>;

export const FOREST_CITY_HOSPITALITY_ADMITTED_MEDIA = Object.freeze(admitted);

export const FOREST_CITY_HOSPITALITY_FRONTEND_PROJECTION_RULES = Object.freeze({
  media: {
    hero: "detail_gallery_primary",
    supportingField: "admittedMedia",
    supportingPlacement: "gallery_supporting",
    searchPlacementField: "searchPlacement",
    sourceOrderField: "galleryOrder",
    completeGalleryClaimAllowed: false,
    coverageState: FOREST_CITY_HOSPITALITY_MEDIA_COVERAGE.state,
    noDuplicateSearchPublicPath: true,
  },
  amenityGroups: Object.freeze([
    { id: "facilities", sourceField: "facilities", label: "Facilities" },
    { id: "dining", sourceField: "dining", label: "Dining" },
    { id: "meetings", sourceField: "meetings", label: "Meetings & events" },
  ]),
  iconPolicy:
    "icons_are_presentational_only_and_must_not_add_facts_beyond_source_items",
  roomBinding:
    "media_and_discovery_labels_do_not_create_canonical_or_bookable_rooms",
});

export function getForestCityHospitalityAdmittedMedia(
  propertyId: ForestCityContentPropertyId,
) {
  return FOREST_CITY_HOSPITALITY_ADMITTED_MEDIA[propertyId];
}

export function findForestCityHospitalityMediaAdmission(sourceUrl: string) {
  return (
    Object.values(FOREST_CITY_HOSPITALITY_ADMITTED_MEDIA)
      .flat()
      .find((item) => item.sourceUrl === sourceUrl) ?? null
  );
}
